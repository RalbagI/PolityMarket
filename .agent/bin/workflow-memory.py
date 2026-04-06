#!/usr/bin/env python3
"""
Workflow memory helper for PolityMarket.

Adds lightweight recall/snapshot/learn primitives for workflows.
Stores runtime state in .agent/state/ (ignored by git).
Adapted from Tipi project.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
STATE_DIR = ROOT / ".agent" / "state"
MEMORY_FILE = STATE_DIR / "workflow_memory.jsonl"
SNAPSHOT_FILE = STATE_DIR / "workflow_snapshots.jsonl"
LESSONS_FILES = [
    ROOT / ".agent" / "lessons_learned.md",
]

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "in", "is", "it", "of", "on", "or", "that", "the", "this", "to",
    "with", "workflow", "issue", "review", "results", "prepare",
    "merge", "resolve", "politymarket",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z0-9_-]+", text.lower())
    deduped: list[str] = []
    seen = set()
    for token in tokens:
        if len(token) < 3 or token in STOPWORDS:
            continue
        if token in seen:
            continue
        seen.add(token)
        deduped.append(token)
    return deduped


def safe_git(args: list[str]) -> str:
    try:
        result = subprocess.run(
            ["git", *args], cwd=ROOT,
            capture_output=True, text=True, check=False,
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def ensure_state_dir() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def append_jsonl(path: Path, payload: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=True) + "\n")


def parse_iso(ts: str):
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None


def collect_file_entries(path: Path, source_name: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    if not path.exists():
        return entries
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return entries

    for line_no, raw in enumerate(lines, start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("- "):
            text = line[2:].strip()
        elif line.startswith("* "):
            text = line[2:].strip()
        elif re.match(r"^\d+\.\s+", line):
            text = re.sub(r"^\d+\.\s+", "", line).strip()
        else:
            if len(line) > 220 or ":" not in line:
                continue
            text = line
        text = normalize_ws(text)
        if len(text) < 12:
            continue
        entries.append({
            "text": text, "source": f"{source_name}:{line_no}",
            "timestamp": "", "workflow": "", "issue": "",
            "topic": "", "kind": "doc",
        })
    return entries


def collect_runtime_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    if not MEMORY_FILE.exists():
        return entries
    try:
        lines = MEMORY_FILE.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return entries
    for idx, raw in enumerate(lines, start=1):
        if not raw.strip():
            continue
        try:
            item = json.loads(raw)
        except json.JSONDecodeError:
            continue
        text = normalize_ws(str(item.get("text", "")))
        if not text:
            continue
        entries.append({
            "text": text, "source": f"runtime:{idx}",
            "timestamp": str(item.get("timestamp", "")),
            "workflow": str(item.get("workflow", "")),
            "issue": str(item.get("issue", "")),
            "topic": str(item.get("topic", "")),
            "kind": "runtime",
        })
    return entries


def score_entry(entry: dict[str, Any], query: str, tokens: list[str],
                workflow: str, issue: str) -> float:
    haystack = " ".join([
        str(entry.get("text", "")), str(entry.get("workflow", "")),
        str(entry.get("issue", "")), str(entry.get("topic", "")),
    ]).lower()

    score = 0.0
    if query and query.lower() in haystack:
        score += 6.0
    for token in tokens:
        if token in haystack:
            score += 2.0
    if workflow and str(entry.get("workflow", "")).lower() == workflow.lower():
        score += 1.5
    if issue and str(entry.get("issue", "")) == issue:
        score += 2.0
    if entry.get("kind") == "runtime":
        score += 0.5
        dt = parse_iso(str(entry.get("timestamp", "")))
        if dt is not None:
            age_days = max(0.0,
                (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).total_seconds() / 86400.0)
            score += max(0.0, 2.0 - (age_days / 15.0))
    return score


def build_auto_text(workflow: str, issue: str, topic: str) -> str:
    branch = safe_git(["rev-parse", "--abbrev-ref", "HEAD"])
    commit_subject = safe_git(["log", "-1", "--pretty=%s"])
    changed = safe_git(["show", "--name-only", "--pretty=", "HEAD"])
    if not changed:
        changed = safe_git(["diff", "--name-only"])
    files = [line.strip() for line in changed.splitlines() if line.strip()]
    files_display = ", ".join(files[:6]) if files else "no file list"
    parts = [
        f"workflow={workflow}", f"issue={issue or '-'}",
        f"topic={topic or '-'}", f"branch={branch or '-'}",
        f"commit={commit_subject or '-'}", f"files={files_display}",
    ]
    return normalize_ws("; ".join(parts))


def compute_state_fingerprint(workflow: str) -> str:
    """Compute a fingerprint of current repo state for circuit breaker detection."""
    branch = safe_git(["rev-parse", "--abbrev-ref", "HEAD"])
    commit = safe_git(["rev-parse", "HEAD"])
    changed = safe_git(["diff", "--name-only"])
    base = f"{workflow}|{branch}|{commit}|{changed}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:20]


def check_circuit_breaker(workflow: str, max_retries: int = 2,
                          window_minutes: int = 30) -> bool:
    """Check if the same workflow has run with the same state fingerprint recently.
    Returns True if circuit breaker should trip (too many retries)."""
    current_fp = compute_state_fingerprint(workflow)
    if not SNAPSHOT_FILE.exists():
        return False
    cutoff = datetime.now(timezone.utc).timestamp() - (window_minutes * 60)
    match_count = 0
    try:
        for raw in SNAPSHOT_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
            if not raw.strip():
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if item.get("workflow") != workflow:
                continue
            if item.get("phase") != "start":
                continue
            ts = parse_iso(str(item.get("timestamp", "")))
            if ts is None:
                continue
            if ts.astimezone(timezone.utc).timestamp() < cutoff:
                continue
            if item.get("state_fingerprint") == current_fp:
                match_count += 1
    except OSError:
        return False
    return match_count >= max_retries


def recall(args: argparse.Namespace) -> int:
    query = normalize_ws(" ".join([args.topic or "", args.issue or "", args.workflow or ""]))
    tokens = tokenize(query)
    entries: list[dict[str, Any]] = []
    entries.extend(collect_runtime_entries())
    for file_path in LESSONS_FILES:
        entries.extend(collect_file_entries(file_path, file_path.name))

    scored = []
    for entry in entries:
        s = score_entry(entry, query, tokens, args.workflow, args.issue)
        if s > 0:
            scored.append((s, entry))
    scored.sort(key=lambda item: item[0], reverse=True)
    top = scored[:args.limit]

    print("WORKFLOW MEMORY RECALL")
    print(f"query={query or '(empty)'}")
    if not top:
        print("result=no_hits")
        print("hint=No prior matches found in lessons/runtime memory.")
        return 0
    print(f"result=hits:{len(top)}")
    for s, entry in top:
        text = str(entry["text"])
        if len(text) > 180:
            text = text[:177] + "..."
        print(f"- score={s:.1f} source={entry['source']} text={text}")
    return 0


def snapshot(args: argparse.Namespace) -> int:
    ensure_state_dir()
    branch = args.branch or safe_git(["rev-parse", "--abbrev-ref", "HEAD"])
    changed_output = safe_git(["diff", "--name-only", "origin/main...HEAD"])
    if not changed_output:
        changed_output = safe_git(["diff", "--name-only"])
    changed_files = [line.strip() for line in changed_output.splitlines() if line.strip()]
    triggered_by = args.triggered_by or ""
    state_fp = compute_state_fingerprint(args.workflow) if args.phase == "start" else ""
    payload = {
        "timestamp": now_iso(), "workflow": args.workflow,
        "phase": args.phase, "issue": args.issue or "",
        "topic": args.topic or "", "branch": branch or "",
        "changed_files_count": len(changed_files),
        "changed_files_sample": changed_files[:10],
        "note": normalize_ws(args.note or ""),
        "triggered_by": triggered_by,
        "state_fingerprint": state_fp,
    }
    append_jsonl(SNAPSHOT_FILE, payload)
    print(f"snapshot_recorded workflow={args.workflow} phase={args.phase} "
          f"issue={args.issue or '-'} files={len(changed_files)}")
    return 0


def memory_fingerprint(workflow: str, issue: str, text: str) -> str:
    base = f"{workflow}|{issue}|{normalize_ws(text).lower()}"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:16]


def fingerprint_exists(fingerprint: str) -> bool:
    if not MEMORY_FILE.exists():
        return False
    try:
        for raw in MEMORY_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
            if not raw.strip():
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if item.get("fingerprint") == fingerprint:
                return True
    except OSError:
        return False
    return False


def learn(args: argparse.Namespace) -> int:
    ensure_state_dir()
    text = normalize_ws(args.text or "")
    if args.auto or not text:
        auto_text = build_auto_text(args.workflow, args.issue or "", args.topic or "")
        text = normalize_ws(f"{text} {auto_text}".strip())
    if not text:
        print("learn_skipped reason=empty_text")
        return 0
    fingerprint = memory_fingerprint(args.workflow, args.issue or "", text)
    if fingerprint_exists(fingerprint):
        print(f"learn_skipped reason=duplicate fingerprint={fingerprint}")
        return 0
    outcome = getattr(args, "outcome", "") or ""
    payload = {
        "timestamp": now_iso(), "workflow": args.workflow,
        "issue": args.issue or "", "topic": args.topic or "",
        "text": text, "outcome": outcome,
        "tags": tokenize(" ".join([args.workflow, args.topic or "", args.issue or ""]))[:8],
        "fingerprint": fingerprint,
    }
    append_jsonl(MEMORY_FILE, payload)
    print(f"learn_recorded fingerprint={fingerprint}")
    print(f"text={text}")
    return 0


def gc(args: argparse.Namespace) -> int:
    """Garbage collect old memory and snapshot entries."""
    ensure_state_dir()
    memory_days = args.memory_days
    snapshot_days = args.snapshot_days
    now = datetime.now(timezone.utc)

    def prune_jsonl(path: Path, max_age_days: int) -> int:
        if not path.exists():
            return 0
        cutoff = now.timestamp() - (max_age_days * 86400)
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
        kept: list[str] = []
        pruned = 0
        for raw in lines:
            if not raw.strip():
                continue
            try:
                item = json.loads(raw)
            except json.JSONDecodeError:
                continue
            ts = parse_iso(str(item.get("timestamp", "")))
            if ts is not None and ts.astimezone(timezone.utc).timestamp() < cutoff:
                pruned += 1
                continue
            kept.append(raw)
        if pruned > 0:
            path.write_text("\n".join(kept) + "\n" if kept else "", encoding="utf-8")
        return pruned

    mem_pruned = prune_jsonl(MEMORY_FILE, memory_days)
    snap_pruned = prune_jsonl(SNAPSHOT_FILE, snapshot_days)
    print(f"gc_complete memory_pruned={mem_pruned} snapshot_pruned={snap_pruned}")
    return 0


def check_breaker(args: argparse.Namespace) -> int:
    """Check circuit breaker for a workflow. Exits 1 if tripped."""
    tripped = check_circuit_breaker(
        args.workflow, args.max_retries, args.window_minutes
    )
    fp = compute_state_fingerprint(args.workflow)
    if tripped:
        print(f"CIRCUIT_BREAKER_TRIPPED workflow={args.workflow} fingerprint={fp}")
        print(f"The same workflow has been retried {args.max_retries}+ times "
              f"with identical state within {args.window_minutes} minutes.")
        print("Action: Exiting to prevent infinite loop. Manual intervention required.")
        return 1
    print(f"circuit_breaker_ok workflow={args.workflow} fingerprint={fp}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Workflow memory helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    recall_p = subparsers.add_parser("recall", help="Recall prior lessons")
    recall_p.add_argument("--workflow", default="")
    recall_p.add_argument("--issue", default="")
    recall_p.add_argument("--topic", default="")
    recall_p.add_argument("--limit", type=int, default=8)

    snap_p = subparsers.add_parser("snapshot", help="Persist workflow snapshot")
    snap_p.add_argument("--workflow", required=True)
    snap_p.add_argument("--phase", required=True)
    snap_p.add_argument("--issue", default="")
    snap_p.add_argument("--topic", default="")
    snap_p.add_argument("--branch", default="")
    snap_p.add_argument("--note", default="")
    snap_p.add_argument("--triggered-by", default="",
                        help="Which workflow triggered this one")

    learn_p = subparsers.add_parser("learn", help="Persist runtime memory")
    learn_p.add_argument("--workflow", required=True)
    learn_p.add_argument("--issue", default="")
    learn_p.add_argument("--topic", default="")
    learn_p.add_argument("--text", default="")
    learn_p.add_argument("--auto", action="store_true")
    learn_p.add_argument("--outcome", default="",
                         choices=["", "success", "failure", "partial"],
                         help="Outcome of the workflow run")

    gc_p = subparsers.add_parser("gc", help="Garbage collect old entries")
    gc_p.add_argument("--memory-days", type=int, default=30,
                      help="Prune memory entries older than N days")
    gc_p.add_argument("--snapshot-days", type=int, default=90,
                      help="Prune snapshot entries older than N days")

    cb_p = subparsers.add_parser("check-breaker",
                                 help="Check circuit breaker for a workflow")
    cb_p.add_argument("--workflow", required=True)
    cb_p.add_argument("--max-retries", type=int, default=2)
    cb_p.add_argument("--window-minutes", type=int, default=30)

    fp_p = subparsers.add_parser("fingerprint",
                                 help="Compute state fingerprint for a workflow")
    fp_p.add_argument("--workflow", required=True)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.command == "recall":
        return recall(args)
    if args.command == "snapshot":
        return snapshot(args)
    if args.command == "learn":
        return learn(args)
    if args.command == "gc":
        return gc(args)
    if args.command == "check-breaker":
        return check_breaker(args)
    if args.command == "fingerprint":
        fp = compute_state_fingerprint(args.workflow)
        print(f"fingerprint={fp} workflow={args.workflow}")
        return 0
    parser.error("unsupported command")
    return 2


if __name__ == "__main__":
    sys.exit(main())
