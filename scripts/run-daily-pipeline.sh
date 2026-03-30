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
trap 'rm -f "${LOCK_FILE}"' INT TERM

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
export PATH="${HOME}/.npm-global/bin:${HOME}/.local/bin:/usr/local/bin:${PATH}"

# Verify Codex CLI is available
if ! command -v codex &>/dev/null; then
  echo "Codex CLI (codex) not found in PATH" >&2
  exit 1
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
}
trap cleanup EXIT

# ── Sync with origin/main ────────────────────────────────────────────
git fetch --quiet origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"
if [[ "${LOCAL_HEAD}" != "${REMOTE_HEAD}" ]]; then
  echo "Syncing local main with origin/main..."
  git pull --ff-only origin main || git reset --hard origin/main
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

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  ASKPASS_FILE="$(mktemp)"
  cat > "${ASKPASS_FILE}" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  *Username*) printf '%s\n' "x-access-token" ;;
  *Password*) printf '%s\n' "${GITHUB_TOKEN}" ;;
  *) printf '\n' ;;
esac
EOF
  chmod 700 "${ASKPASS_FILE}"
  if GIT_ASKPASS="${ASKPASS_FILE}" git push origin main; then
    rm -f "${ASKPASS_FILE}"
  else
    rm -f "${ASKPASS_FILE}"
    exit 1
  fi
else
  git push origin main
fi

# ── Deploy to Firebase ───────────────────────────────────────────────
if command -v npx &>/dev/null; then
  echo "Building and deploying to Firebase..."
  npx vite build
  npx firebase deploy --only hosting,functions && echo "Firebase deploy complete." || echo "⚠ Firebase deploy failed (non-blocking)."
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
