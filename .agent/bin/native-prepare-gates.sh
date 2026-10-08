#!/usr/bin/env bash
# AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; bin = native-prepare-gates.sh
set -euo pipefail
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
aih_cache_root() {
  if [ -n "${AI_HELPERS_CACHE:-}" ]; then
    printf '%s\n' "$AI_HELPERS_CACHE"
    return
  fi
  case "$(uname -s 2>/dev/null || printf unknown)" in
    Darwin*) printf '%s\n' "$HOME/Library/Caches/TalkPoint/AI_Helpers" ;;
    MINGW*|MSYS*|CYGWIN*) printf '%s\n' "${LOCALAPPDATA:-$HOME/AppData/Local}/TalkPoint/AI_Helpers" ;;
    *) printf '%s\n' "${XDG_CACHE_HOME:-$HOME/.cache}/talkpoint/AI_Helpers" ;;
  esac
}

aih_is_central() {
  candidate="$1"
  [ -n "$candidate" ] || return 1
  [ -x "$candidate/bin/aih" ] &&
    [ -f "$candidate/tools/aih.py" ] &&
    [ -f "$candidate/VERSION" ] &&
    [ -d "$candidate/content/workflows/universal" ] &&
    [ -f "$candidate/.agent/ai-helpers.yml" ] &&
    grep -Eq '^[[:space:]]*id:[[:space:]]*['"'"'"]?ai_helpers['"'"'"]?([[:space:]]*(#.*)?)?$' "$candidate/.agent/ai-helpers.yml"
}

aih_find_central() {
  if [ -n "${AI_HELPERS_HOME:-}" ] && aih_is_central "$AI_HELPERS_HOME"; then
    printf '%s\n' "$AI_HELPERS_HOME"
    return 0
  fi
  if aih_is_central "$PROJECT_ROOT"; then
    printf '%s\n' "$PROJECT_ROOT"
    return 0
  fi
  if aih_is_central "$PROJECT_ROOT/../AI_Helpers"; then
    printf '%s\n' "$PROJECT_ROOT/../AI_Helpers"
    return 0
  fi
  cache="$(aih_cache_root)"
  if aih_is_central "$cache"; then
    printf '%s\n' "$cache"
    return 0
  fi
  return 1
}
CENTRAL=$(aih_find_central) || {
  echo "[FAIL] AI_Helpers is missing. Run: scripts/ai/bootstrap-ai-helpers.sh" >&2
  exit 1
}
cd "$PROJECT_ROOT"
export AI_HELPERS_PROJECT_ROOT="$PROJECT_ROOT"
export AI_HELPERS_PROJECT_ID="polity_market"
export AI_HELPERS_CENTRAL_ROOT="$CENTRAL"
python3 "$CENTRAL/tools/validate_native_gate.py" --project-root "$PROJECT_ROOT" --project-id "polity_market"
exec bash "$CENTRAL/projects/polity_market/bin/native-prepare-gates.sh" "$@"
