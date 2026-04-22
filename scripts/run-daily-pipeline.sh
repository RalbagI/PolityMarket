#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

# ── Lock file to prevent concurrent runs ─────────────────────────────
LOCK_FILE="${REPO_ROOT}/.pipeline.lock"
if [[ -f "${LOCK_FILE}" ]]; then
  LOCK_PID="$(cat "${LOCK_FILE}" 2>/dev/null || echo "")"
  if [[ -n "${LOCK_PID}" ]] && kill -0 "${LOCK_PID}" 2>/dev/null; then
    echo "Pipeline already running (PID ${LOCK_PID}). Exiting." >&2
    exit 0
  fi
  echo "Removing stale lock file (PID ${LOCK_PID} not running)."
  rm -f "${LOCK_FILE}"
fi
echo $$ > "${LOCK_FILE}"
# Cover EXIT (not just INT/TERM) so any early `exit 1` (missing env file,
# missing token, LLM CLI not on PATH) still drops the lock. Replaced by the
# fuller `trap cleanup EXIT` once the rest of the cleanup state is set up.
trap 'rm -f "${LOCK_FILE}"' INT TERM EXIT

# ── Load environment ─────────────────────────────────────────────────
ENV_FILE="${PIPELINE_ENV_FILE:-${REPO_ROOT}/.env.pipeline}"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing pipeline env file: ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "${ENV_FILE}"
set +a

export TZ="${TZ:-Asia/Jerusalem}"
export OPENAI_MODEL_HIGH="${OPENAI_MODEL_HIGH:-gpt-5.4}"
export OPENAI_MODEL_LOW="${OPENAI_MODEL_LOW:-gpt-5.4-mini}"
export OPENAI_TIMEOUT_MS="${OPENAI_TIMEOUT_MS:-600000}"
export MAX_BATCH_SIZE="${MAX_BATCH_SIZE:-20}"
export MAX_PROMPT_CHARS="${MAX_PROMPT_CHARS:-350000}"
export OPENAI_HIGH_TIER_THRESHOLD="${OPENAI_HIGH_TIER_THRESHOLD:-5}"
export PIPELINE_EXPECTED_POLITICIAN_COUNT="${PIPELINE_EXPECTED_POLITICIAN_COUNT:-135}"
export PIPELINE_MAX_FETCH_FAILURES="${PIPELINE_MAX_FETCH_FAILURES:-0}"
export GIT_TERMINAL_PROMPT=0

# Ensure PATH includes npm global bin (needed for cron which has minimal PATH)
# /home/linuxbrew/.linuxbrew/bin is added so `gh` is found under systemd-user,
# whose default PATH is otherwise minimal.
export PATH="${HOME}/.npm-global/bin:${HOME}/.local/bin:/home/linuxbrew/.linuxbrew/bin:/usr/local/bin:${PATH}"

# ── Resolve GitHub auth token for unattended git fetch/pull/push ─────
# A systemd user service cannot reach the desktop GNOME keyring, so the global
# `gh auth git-credential` helper returns empty and git falls back to a disabled
# terminal prompt — failing every network git op. For HTTPS remotes we resolve
# a token and wire it inline onto each git network command via GIT_ASKPASS.
# SSH remotes skip the flow entirely and rely on ssh-agent / SSH keys.
# shellcheck source=scripts/lib/pipeline-auth.sh
source "${SCRIPT_DIR}/lib/pipeline-auth.sh"

RESOLVED_TOKEN=""
if is_https_remote; then
  RESOLVED_TOKEN="$(resolve_github_token || true)"
  if [[ -z "${RESOLVED_TOKEN}" ]]; then
    echo "FATAL: No GitHub token available for unattended git operations." >&2
    echo "  Fix: add GITHUB_TOKEN=<pat> to ${ENV_FILE} (or run 'gh auth login' in a" >&2
    echo "  session that shares the keyring with the systemd user manager)." >&2
    exit 1
  fi
else
  echo "Remote is not HTTPS — skipping token-based auth wiring (using SSH keys)."
fi

# Verify LLM CLI is available (Codex or Claude)
if [[ "${LLM_PROVIDER:-codex}" == "claude" ]]; then
  if ! command -v claude &>/dev/null; then
    echo "Claude CLI (claude) not found in PATH" >&2
    exit 1
  fi
  echo "Using Claude CLI as primary LLM provider"
elif ! command -v codex &>/dev/null; then
  if command -v claude &>/dev/null; then
    echo "Codex CLI not found, but Claude CLI available — setting LLM_PROVIDER=claude"
    export LLM_PROVIDER=claude
  else
    echo "Neither Codex CLI nor Claude CLI found in PATH" >&2
    exit 1
  fi
fi

# ── Save current branch and stash any work-in-progress ───────────────
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
STASHED=false
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Stashing uncommitted changes on ${ORIGINAL_BRANCH}..."
  git stash push -m "pipeline-auto-stash-$(date +%s)" --include-untracked
  STASHED=true
fi

# Switch to main if needed
if [[ "${ORIGINAL_BRANCH}" != "main" ]]; then
  echo "Switching from ${ORIGINAL_BRANCH} to main for pipeline run..."
  git checkout main
fi

# Cleanup function to restore original state
cleanup() {
  # Discard any pipeline-generated data files before switching back
  git checkout -- public/data/ 2>/dev/null || true
  if [[ "${ORIGINAL_BRANCH}" != "main" ]]; then
    git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
  fi
  if [[ "${STASHED}" == "true" ]]; then
    git stash pop 2>/dev/null || echo "⚠ Could not auto-restore stash — run 'git stash pop' manually."
  fi
  rm -f "${LOCK_FILE}"
  if [[ -n "${ASKPASS_FILE:-}" ]]; then
    rm -f "${ASKPASS_FILE}"
  fi
}
trap cleanup EXIT

# Install the askpass helper after the cleanup trap is armed so a failure here
# can't leak the file. The token is baked into the helper (chmod 700, owner-
# only); we deliberately do NOT export GIT_ASKPASS — a subprocess could read
# $GIT_ASKPASS and cat the helper to recover the token. Instead, every git
# network op below sets GIT_ASKPASS inline so only the git child sees it.
ASKPASS_FILE=""
if [[ -n "${RESOLVED_TOKEN}" ]]; then
  ASKPASS_FILE="$(create_askpass_helper "${RESOLVED_TOKEN}")"
fi
unset RESOLVED_TOKEN GITHUB_TOKEN

# ── Sync with origin/main ────────────────────────────────────────────
GIT_ASKPASS="${ASKPASS_FILE}" git fetch --quiet origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"
if [[ "${LOCAL_HEAD}" != "${REMOTE_HEAD}" ]]; then
  echo "Syncing local main with origin/main..."
  GIT_ASKPASS="${ASKPASS_FILE}" git pull --ff-only origin main || git reset --hard origin/main
fi

# ── Install dependencies (catches new deps from merged PRs) ──────────
npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -1

# ── Run pipeline ─────────────────────────────────────────────────────
echo "Running daily pipeline..."
node data-pipeline/generateDailyScores.js

RUN_DATE="$(TZ="${TZ}" date +%F)"
echo "Validating artifacts for ${RUN_DATE}..."
node scripts/validate-daily-artifacts.js --date "${RUN_DATE}" --expected "${PIPELINE_EXPECTED_POLITICIAN_COUNT}"

# Stage data artifacts — required files first, then optional ones that may not exist yet
git add public/data/timeseries_summary.json public/data/party_summary.json public/data/details public/data/drift_log.json
# Volatility data is optional (only generated when volatility.js is present in pipeline)
[[ -f public/data/volatility_data.json ]] && git add public/data/volatility_data.json

if git diff --cached --quiet; then
  echo "No data changes detected; nothing to commit."
  exit 0
fi

git commit -m "chore(data): daily pipeline update [${RUN_DATE}]"

GIT_ASKPASS="${ASKPASS_FILE}" git push origin main

# ── Deploy to Firebase ───────────────────────────────────────────────
EXPECTED_PROJECT="politymarket"

# Fail-closed: verify .firebaserc says politymarket (must match, not just "not wrong")
RC_PROJECT="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('.firebaserc','utf8')).projects.default||'')}catch{console.log('')}" 2>/dev/null || echo "")"
if [[ "${RC_PROJECT}" != "${EXPECTED_PROJECT}" ]]; then
  echo "FATAL: .firebaserc default project is '${RC_PROJECT}', expected '${EXPECTED_PROJECT}'." >&2
  exit 1
fi

# Also check active Firebase CLI project (fail-closed on mismatch)
ACTIVE_PROJECT="$(npx firebase-tools use --json 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.result||'')}catch{}" 2>/dev/null || echo "")"
if [[ -n "${ACTIVE_PROJECT}" && "${ACTIVE_PROJECT}" != "${EXPECTED_PROJECT}" ]]; then
  echo "FATAL: Firebase active project is '${ACTIVE_PROJECT}', expected '${EXPECTED_PROJECT}'." >&2
  echo "Run: firebase use ${EXPECTED_PROJECT}" >&2
  exit 1
fi

if command -v npx &>/dev/null; then
  echo "Building and deploying to Firebase (project: ${EXPECTED_PROJECT})..."
  npx vite build
  npx firebase-tools deploy --only hosting,functions --project "${EXPECTED_PROJECT}" && echo "Firebase deploy complete." || echo "⚠ Firebase deploy failed (non-blocking)."
fi

# ── Trigger volatility alerts ─────────────────────────────────────────
if [[ -n "${PIPELINE_AUTH_TOKEN:-}" ]]; then
  echo "Triggering volatility alerts..."
  curl -fsS -X POST \
    -H "Authorization: Bearer ${PIPELINE_AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    "https://politymarket.web.app/api/trigger-alerts" \
    -o /dev/null \
    && echo "Volatility alerts triggered." \
    || echo "⚠ Volatility alert trigger failed (non-blocking)."
fi

echo "Daily pipeline completed and pushed to origin/main."
