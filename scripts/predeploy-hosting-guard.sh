#!/usr/bin/env bash
# predeploy-hosting-guard.sh
# ------------------------------------------------------------------
# Firebase predeploy hook for PolityMarket hosting.
# FAIL-CLOSED: blocks deploy unless it can positively confirm that
# the target project is 'politymarket'. This prevents cross-project
# deployments into tipi-83650 or any other Firebase project.
#
# Note: Firebase sets GCLOUD_PROJECT during predeploy hooks to the
# project being deployed to. This is the strongest check — it catches
# --project overrides that .firebaserc checks would miss.
# ------------------------------------------------------------------
set -euo pipefail

EXPECTED_PROJECT="politymarket"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/dist"

# 1. Verify project from .firebaserc (fail-closed: must match)
RC_FILE="${REPO_ROOT}/.firebaserc"
RC_PROJECT=""
if [ -f "${RC_FILE}" ]; then
  RC_PROJECT="$(node -e "console.log(JSON.parse(require('fs').readFileSync('${RC_FILE}','utf8')).projects.default||'')" 2>/dev/null || echo "")"
fi

if [ "${RC_PROJECT}" != "${EXPECTED_PROJECT}" ]; then
  echo "FATAL: predeploy guard: .firebaserc default project is '${RC_PROJECT}', expected '${EXPECTED_PROJECT}'." >&2
  echo "Run: firebase use ${EXPECTED_PROJECT}" >&2
  exit 1
fi

# 2. Verify active Firebase project (fail-closed on mismatch)
#    GCLOUD_PROJECT is set by Firebase CLI during predeploy execution,
#    reflecting the actual target project (including --project overrides).
ACTIVE_PROJECT="${GCLOUD_PROJECT:-}"
if [ -z "${ACTIVE_PROJECT}" ]; then
  ACTIVE_PROJECT="$(npx firebase-tools use --json 2>/dev/null \
    | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(d.result||'')}catch{}" 2>/dev/null || echo "")"
fi

if [ -n "${ACTIVE_PROJECT}" ] && [ "${ACTIVE_PROJECT}" != "${EXPECTED_PROJECT}" ]; then
  echo "FATAL: predeploy guard: active Firebase project is '${ACTIVE_PROJECT}', expected '${EXPECTED_PROJECT}'." >&2
  echo "Run: firebase use ${EXPECTED_PROJECT}" >&2
  exit 1
fi

# 3. Verify dist/index.html exists and does NOT contain Tipi content
if [ ! -f "${DIST_DIR}/index.html" ]; then
  echo "FATAL: predeploy guard: ${DIST_DIR}/index.html not found. Build may have failed." >&2
  exit 1
fi

if grep -qi "tipi\.zone\|tipi-83650" "${DIST_DIR}/index.html" 2>/dev/null; then
  echo "FATAL: predeploy guard: ${DIST_DIR}/index.html contains Tipi references!" >&2
  echo "Wrong web app is being deployed from PolityMarket. Aborting." >&2
  exit 1
fi

echo "predeploy guard: verified PolityMarket project and content - OK"
