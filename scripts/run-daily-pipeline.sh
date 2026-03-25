#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

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

# Save current branch and stash any work-in-progress
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
  if [[ "${ORIGINAL_BRANCH}" != "main" ]]; then
    git checkout "${ORIGINAL_BRANCH}" 2>/dev/null || true
  fi
  if [[ "${STASHED}" == "true" ]]; then
    git stash pop 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Sync with origin/main
git fetch --quiet origin main
LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"
if [[ "${LOCAL_HEAD}" != "${REMOTE_HEAD}" ]]; then
  echo "Syncing local main with origin/main..."
  git reset --hard origin/main
fi

echo "Running daily pipeline..."
node data-pipeline/generateDailyScores.js

RUN_DATE="$(TZ="${TZ}" date +%F)"
echo "Validating artifacts for ${RUN_DATE}..."
node scripts/validate-daily-artifacts.js --date "${RUN_DATE}" --expected "${PIPELINE_EXPECTED_POLITICIAN_COUNT}"

git add public/data/timeseries_summary.json public/data/party_summary.json public/data/details public/data/drift_log.json

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

# Deploy to Firebase if npx is available
if command -v npx &>/dev/null; then
  echo "Building and deploying to Firebase..."
  npx vite build
  npx firebase deploy --only hosting 2>/dev/null && echo "Firebase deploy complete." || echo "⚠ Firebase deploy failed (non-blocking)."
fi

echo "Daily pipeline completed and pushed to origin/main."
