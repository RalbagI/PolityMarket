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
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen3:8b}"
export PIPELINE_EXPECTED_POLITICIAN_COUNT="${PIPELINE_EXPECTED_POLITICIAN_COUNT:-120}"
export GIT_TERMINAL_PROMPT=0

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  echo "Pipeline runner must execute on main branch (current: ${CURRENT_BRANCH})" >&2
  exit 1
fi

NON_DATA_CHANGES="$(
  (
    git diff --name-only
    git diff --cached --name-only
    git ls-files --others --exclude-standard
  ) | sort -u | grep -v '^public/data/' || true
)"
if [[ -n "${NON_DATA_CHANGES}" ]]; then
  echo "Refusing to run with non-data working tree changes:" >&2
  echo "${NON_DATA_CHANGES}" >&2
  exit 1
fi

echo "Running daily pipeline..."
node data-pipeline/generateDailyScores.js

RUN_DATE="$(TZ="${TZ}" date +%F)"
echo "Validating artifacts for ${RUN_DATE}..."
node scripts/validate-daily-artifacts.js --date "${RUN_DATE}" --expected "${PIPELINE_EXPECTED_POLITICIAN_COUNT}"

git add public/data/timeseries_summary.json public/data/details public/data/drift_log.json

if git diff --cached --quiet; then
  echo "No data changes detected; nothing to commit."
  exit 0
fi

git commit -m "chore(data): daily pipeline update [${RUN_DATE}]"

if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  git -c "http.https://github.com/.extraheader=AUTHORIZATION: bearer ${GITHUB_TOKEN}" push origin main
else
  git push origin main
fi

echo "Daily pipeline completed and pushed to origin/main."
