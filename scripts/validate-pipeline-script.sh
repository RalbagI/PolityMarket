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

echo ""
if [[ ${ERRORS} -gt 0 ]]; then
  echo "FAILED: ${ERRORS} issue(s) found in pipeline script"
  exit 1
fi

echo "All pipeline script validations passed ✓"
