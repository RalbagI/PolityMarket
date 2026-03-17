#!/usr/bin/env bash
# Fetch GitHub issue details using gh CLI.
# Usage: gh-issue-view.sh <issue-number> [--comments]

set -euo pipefail

ISSUE_NUMBER="${1:?Usage: gh-issue-view.sh <issue-number> [--comments]}"
SHOW_COMMENTS="${2:-}"

echo "=== Issue #${ISSUE_NUMBER} ==="
gh issue view "$ISSUE_NUMBER" 2>/dev/null || {
  echo "Failed to fetch issue #${ISSUE_NUMBER}"
  exit 1
}

if [ "$SHOW_COMMENTS" = "--comments" ]; then
  echo ""
  echo "=== Comments ==="
  gh issue view "$ISSUE_NUMBER" --comments 2>/dev/null || echo "No comments or failed to fetch."
fi
