#!/usr/bin/env bash
# AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; script = sync-ai-workflows
set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AGENT="codex"
WORKFLOW=""
QUERY=""
FORMAT="markdown"
MAX_CHARS=""
RUN_CONTEXT=false
RUN_CONTEXT_SEARCH=false
RUN_SYNC=false

CHANGED_PATHS=()

require_value() {
  name="$1"
  value="${2:-}"
  if [ -z "$value" ]; then
    echo "sync-ai-workflows.sh: $name requires a value" >&2
    exit 2
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --context)
      RUN_CONTEXT=true
      ;;
    --search-context)
      RUN_CONTEXT_SEARCH=true
      ;;
    --sync)
      RUN_SYNC=true
      ;;
    --agent=*)
      AGENT="${1#--agent=}"
      require_value --agent "$AGENT"
      ;;
    --agent)
      shift
      require_value --agent "${1:-}"
      AGENT="$1"
      ;;
    --workflow=*)
      WORKFLOW="${1#--workflow=}"
      require_value --workflow "$WORKFLOW"
      ;;
    --workflow)
      shift
      require_value --workflow "${1:-}"
      WORKFLOW="$1"
      ;;
    --query=*)
      QUERY="${1#--query=}"
      ;;
    --query)
      shift
      require_value --query "${1:-}"
      QUERY="$1"
      ;;
    --changed-path=*)
      CHANGED_PATHS+=("${1#--changed-path=}")
      ;;
    --changed-path)
      shift
      require_value --changed-path "${1:-}"
      CHANGED_PATHS+=("$1")
      ;;
    --format=*)
      FORMAT="${1#--format=}"
      ;;
    --format)
      shift
      require_value --format "${1:-}"
      FORMAT="$1"
      ;;
    --max-chars=*)
      MAX_CHARS="${1#--max-chars=}"
      ;;
    --max-chars)
      shift
      require_value --max-chars "${1:-}"
      MAX_CHARS="$1"
      ;;
    --project-root=*)
      PROJECT_ROOT="${1#--project-root=}"
      require_value --project-root "$PROJECT_ROOT"
      ;;
    --project-root)
      shift
      require_value --project-root "${1:-}"
      PROJECT_ROOT="$1"
      ;;
    *)
      echo "sync-ai-workflows.sh: unknown arg '$1'" >&2
      exit 2
      ;;
  esac
  shift
done

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
AIH="$CENTRAL/bin/aih"
if [ ! -x "$AIH" ]; then
  echo "sync-ai-workflows.sh: missing executable $AIH" >&2
  exit 1
fi

if [ "$RUN_CONTEXT" = true ]; then
  if [ -z "$WORKFLOW" ]; then
    echo "sync-ai-workflows.sh: --context requires --workflow" >&2
    exit 2
  fi
  exec "$AIH" context --project-root "$PROJECT_ROOT" --agent "$AGENT" --workflow "$WORKFLOW"
fi

if [ "$RUN_CONTEXT_SEARCH" = true ]; then
  if [ -z "$WORKFLOW" ]; then
    echo "sync-ai-workflows.sh: --search-context requires --workflow" >&2
    exit 2
  fi
  SEARCH_ARGS=(context-search --project-root "$PROJECT_ROOT" --workflow "$WORKFLOW" --query "$QUERY" --format "$FORMAT")
  if [ -n "$MAX_CHARS" ]; then SEARCH_ARGS+=(--max-chars "$MAX_CHARS"); fi
  for changed_path in "${CHANGED_PATHS[@]}"; do SEARCH_ARGS+=(--changed-path "$changed_path"); done
  exec "$AIH" "${SEARCH_ARGS[@]}"
fi

if [ "$RUN_SYNC" = true ] || [ -z "$WORKFLOW" ]; then
  exec "$AIH" sync --project-root "$PROJECT_ROOT"
fi

exec "$AIH" context --project-root "$PROJECT_ROOT" --agent "$AGENT" --workflow "$WORKFLOW"
