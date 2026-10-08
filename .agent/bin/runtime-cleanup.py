#!/usr/bin/env python3
# AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; bin = runtime-cleanup.py
import os
import re
import subprocess
import sys
from pathlib import Path

ID_RE = re.compile(r"(?m)^project:\s*(?:#.*)?$\n(?:(?:[ \t]+.*|[ \t]*#.*|[ \t]*)\n)*?[ \t]+id:\s*['\"]?ai_helpers['\"]?(?:\s*#.*)?$")


def cache_root() -> Path:
    configured = os.environ.get("AI_HELPERS_CACHE")
    if configured:
        return Path(configured).expanduser()
    if sys.platform == "win32":
        return Path(os.environ.get("LOCALAPPDATA") or Path.home() / "AppData" / "Local") / "TalkPoint" / "AI_Helpers"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Caches" / "TalkPoint" / "AI_Helpers"
    return Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "talkpoint" / "AI_Helpers"


def is_central(central):
    try:
        manifest = (central / ".agent" / "ai-helpers.yml").read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False
    return (
        ID_RE.search(manifest)
        and (central / "VERSION").is_file()
        and (central / "tools/aih.py").is_file()
        and (central / "content/workflows/universal").is_dir()
        and ((central / "bin/aih").is_file() or (central / "bin/aih.ps1").is_file())
    )


project_root = Path(__file__).resolve().parents[2]
candidates = []
if home := os.environ.get("AI_HELPERS_HOME"):
    candidates.append(Path(home).expanduser())
candidates.extend([project_root.parent / "AI_Helpers", cache_root()])

matched = None
relative = Path("projects/polity_market/bin/runtime-cleanup.py")
for central in candidates:
    if not is_central(central):
        continue
    matched = matched or central
    target = central / relative
    if not target.is_file():
        continue
    os.environ.update(AI_HELPERS_PROJECT_ROOT=str(project_root), AI_HELPERS_PROJECT_ID="polity_market", AI_HELPERS_CENTRAL_ROOT=str(central))
    os.chdir(project_root)
    code = subprocess.run([sys.executable, str(target), *sys.argv[1:]], check=False).returncode
    sys.exit(128 - code if code < 0 else code)

if matched is not None:
    print(f"[FAIL] AI_Helpers is present but the required helper is missing: {matched / relative}. Update the central checkout, then run aih sync --project-root .", file=sys.stderr)
else:
    bootstrap_hint = r"scripts\ai\bootstrap-ai-helpers.ps1" if sys.platform == "win32" else "scripts/ai/bootstrap-ai-helpers.sh"
    print(f"[FAIL] AI_Helpers is missing. Run: {bootstrap_hint}", file=sys.stderr)
raise SystemExit(1)
