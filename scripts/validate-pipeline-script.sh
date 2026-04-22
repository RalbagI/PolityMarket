#!/usr/bin/env bash
# Validate pipeline script integrity — runs in CI to catch issues before merge.
# Prevents the class of bug where a feature branch modifies run-daily-pipeline.sh
# in ways that break production (e.g., referencing files that don't exist yet).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PIPELINE_SCRIPT="${REPO_ROOT}/scripts/run-daily-pipeline.sh"
ERRORS=0

echo "=== Pipeline Script Validation ==="

# 1. Shellcheck syntax validation
if command -v shellcheck &>/dev/null; then
  echo "→ Running shellcheck..."
  if ! shellcheck -e SC1090,SC1091 "${PIPELINE_SCRIPT}"; then
    echo "FAIL: shellcheck found issues"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✓ shellcheck passed"
  fi
else
  echo "  ⚠ shellcheck not installed, skipping syntax check"
fi

# 2. Verify bash -n (parse without executing)
echo "→ Checking bash syntax..."
if ! bash -n "${PIPELINE_SCRIPT}"; then
  echo "FAIL: bash syntax error in pipeline script"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ bash syntax OK"
fi

# 3. Verify all git-added paths reference existing directories or use conditional checks
echo "→ Checking git add references..."
while IFS= read -r line; do
  # Skip lines that have conditional checks like [[ -f ... ]] &&
  if [[ "$line" == *"[["*"]]"*"&&"* ]]; then
    continue
  fi

  # Extract file paths from git add commands
  for path in $(echo "$line" | sed 's/git add //' | tr ' ' '\n'); do
    # Skip flags
    [[ "$path" == -* ]] && continue
    # Check if the path or its parent directory exists in the repo
    if [[ ! -e "${REPO_ROOT}/${path}" ]] && [[ ! -d "${REPO_ROOT}/$(dirname "${path}")" ]]; then
      echo "FAIL: git add references '${path}' but neither it nor its parent directory exists"
      ERRORS=$((ERRORS + 1))
    fi
  done
done < <(grep '^[[:space:]]*git add ' "${PIPELINE_SCRIPT}" | grep -v '^\s*#')
echo "  ✓ git add paths validated"

# 4. Verify required commands are referenced
echo "→ Checking required command references..."
for cmd in node npm git; do
  if ! grep -q "$cmd" "${PIPELINE_SCRIPT}"; then
    echo "FAIL: pipeline script does not reference required command: ${cmd}"
    ERRORS=$((ERRORS + 1))
  fi
done
echo "  ✓ required commands present"

# 5. Verify set -euo pipefail is present (fail-fast)
echo "→ Checking fail-fast flags..."
if ! grep -q 'set -euo pipefail' "${PIPELINE_SCRIPT}"; then
  echo "FAIL: pipeline script missing 'set -euo pipefail'"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ fail-fast flags present"
fi

# 6. Verify lock file mechanism exists
echo "→ Checking lock file mechanism..."
if ! grep -q 'LOCK_FILE' "${PIPELINE_SCRIPT}"; then
  echo "FAIL: pipeline script missing lock file mechanism"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✓ lock file mechanism present"
fi

# 7. Verify unattended git auth is wired up
# The systemd user service can't reach the desktop keyring, so the pipeline
# must resolve a token up-front and scope GIT_ASKPASS per-command (NOT export
# it — subprocesses would otherwise read the helper path and recover the PAT).
# See: 2026-04-21 pipeline-miss + 2026-04-22 code-review follow-up.
echo "→ Checking unattended git auth wiring..."
AUTH_ERRORS=0
if ! grep -q 'resolve_github_token' "${PIPELINE_SCRIPT}"; then
  echo "FAIL: pipeline script missing resolve_github_token reference"
  AUTH_ERRORS=$((AUTH_ERRORS + 1))
fi
if ! grep -q 'create_askpass_helper' "${PIPELINE_SCRIPT}"; then
  echo "FAIL: pipeline script must use create_askpass_helper from scripts/lib/pipeline-auth.sh"
  AUTH_ERRORS=$((AUTH_ERRORS + 1))
fi
if grep -qE '^[[:space:]]*export[[:space:]]+GIT_ASKPASS=' "${PIPELINE_SCRIPT}"; then
  echo "FAIL: GIT_ASKPASS must not be exported — scope it inline per git command so subprocesses can't read the helper path"
  AUTH_ERRORS=$((AUTH_ERRORS + 1))
fi
# Any bare `git fetch/pull/push` at line start is a leak (no GIT_ASKPASS prefix).
BARE_NET=$(grep -nE '^[[:space:]]*git[[:space:]]+(fetch|pull|push)\b' "${PIPELINE_SCRIPT}" || true)
if [[ -n "${BARE_NET}" ]]; then
  echo "FAIL: bare git fetch/pull/push without inline GIT_ASKPASS prefix:"
  echo "${BARE_NET}" | sed 's/^/    /'
  AUTH_ERRORS=$((AUTH_ERRORS + 1))
fi
if [[ ${AUTH_ERRORS} -eq 0 ]]; then
  echo "  ✓ unattended git auth wiring present"
fi
ERRORS=$((ERRORS + AUTH_ERRORS))

echo ""
if [[ ${ERRORS} -gt 0 ]]; then
  echo "FAILED: ${ERRORS} issue(s) found in pipeline script"
  exit 1
fi

echo "All pipeline script validations passed ✓"
