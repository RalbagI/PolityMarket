#!/usr/bin/env bash
# AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; script = bootstrap-ai-helpers
set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
AI_HELPERS_REPO=${AI_HELPERS_REPO:-https://gitlab.com/TalkPoint/AI_Helpers.git}
AI_HELPERS_REF=${AI_HELPERS_REF:-main}

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

aih_bootstrap_target() {
  if [ -n "${AI_HELPERS_HOME:-}" ]; then
    printf '%s\n' "$AI_HELPERS_HOME"
    return
  fi
  if [ -n "${AI_HELPERS_CACHE:-}" ]; then
    aih_cache_root
    return
  fi
  printf '%s\n' "$PROJECT_ROOT/../AI_Helpers"
}

aih_git_repo() {
  case "$AI_HELPERS_REPO" in
    https://gitlab.com/*)
      if [ -n "${CI_JOB_TOKEN:-}" ]; then
        printf 'https://gitlab-ci-token:%s@%s\n' \
          "$CI_JOB_TOKEN" "${AI_HELPERS_REPO#https://}"
        return
      fi
      ;;
  esac
  printf '%s\n' "$AI_HELPERS_REPO"
}

aih_skip_path_setup() {
  case "${AI_HELPERS_SKIP_PATH_SETUP:-}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

aih_install_path_enabled() {
  case "${AI_HELPERS_INSTALL_PATH:-}" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

aih_python() {
  if [ -n "${AI_HELPERS_PYTHON:-}" ]; then
    printf '%s\n' "$AI_HELPERS_PYTHON"
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s\n' "python3"
    return
  fi
  if command -v python >/dev/null 2>&1; then
    printf '%s\n' "python"
    return
  fi
  if command -v py >/dev/null 2>&1; then
    printf '%s\n' "py"
    return
  fi
  return 1
}

aih_ensure_on_path() {
  if aih_skip_path_setup; then
    return 0
  fi
  if command -v aih >/dev/null 2>&1; then
    return 0
  fi
  bin_dir="$CENTRAL/bin"
  bin_dir_normalized=false
  if command -v cygpath >/dev/null 2>&1; then
    bin_dir=$(cygpath -u "$bin_dir")
    bin_dir_normalized=true
  fi
  case "$bin_dir" in
    [A-Za-z]:/*|[A-Za-z]:\\*)
      drive=${bin_dir%%:*}
      drive=$(printf '%s' "$drive" | tr '[:upper:]' '[:lower:]')
      rest=${bin_dir#?:}
      rest=${rest//\\//}
      rest=${rest#/}
      bin_dir="/$drive/$rest"
      bin_dir_normalized=true
      ;;
  esac
  if [ "$bin_dir_normalized" != true ] && [ ! -d "$bin_dir" ] && normalized_bin_dir=$(cd "$CENTRAL/bin" 2>/dev/null && pwd); then
    bin_dir="$normalized_bin_dir"
  elif [ "$bin_dir_normalized" != true ] && normalized_bin_dir=$(cd "$bin_dir" 2>/dev/null && pwd); then
    bin_dir="$normalized_bin_dir"
  fi
  PATH="$bin_dir${PATH:+:$PATH}"
  export PATH
  if ! aih_install_path_enabled; then
    echo "bootstrap-ai-helpers.sh: added $bin_dir to PATH for this process; set AI_HELPERS_INSTALL_PATH=1 to persist it" >&2
    return 0
  fi
  profile="${AIH_SHELL_PROFILE:-}"
  home_dir="${HOME:-}"
  if [ -z "$profile" ] && [ -n "$home_dir" ]; then
    case "$(basename "${SHELL:-}")" in
      zsh) profile="$home_dir/.zshrc" ;;
      bash) profile="$home_dir/.bashrc" ;;
      *) profile="$home_dir/.profile" ;;
    esac
  fi
  [ -n "$profile" ] || return 0
  AIH_PYTHON=$(aih_python) || {
    echo "bootstrap-ai-helpers.sh: python is required" >&2
    exit 1
  }
  AIH_PROFILE="$profile" AIH_BIN_DIR="$bin_dir" "$AIH_PYTHON" - <<'PY'
import os
from pathlib import Path

profile = Path(os.environ["AIH_PROFILE"])
bin_dir = os.environ["AIH_BIN_DIR"]
begin = "# >>> AI_Helpers CLI >>>"
end = "# <<< AI_Helpers CLI <<<"


def shell_single_quote(value):
    return "'" + value.replace("'", "'\"'\"'") + "'"


block = (
    f"{begin}\n"
    f"AIH_BIN_DIR={shell_single_quote(bin_dir)}\n"
    'case ":$PATH:" in\n'
    '  *":$AIH_BIN_DIR:"*) ;;\n'
    '  *) export PATH="$AIH_BIN_DIR:$PATH" ;;\n'
    "esac\n"
    "unset AIH_BIN_DIR\n"
    f"{end}\n"
)
text = profile.read_text(encoding="utf-8", errors="ignore") if profile.is_file() else ""
if begin in text and end in text:
    before, remainder = text.split(begin, 1)
    _, after = remainder.split(end, 1)
    updated = before.rstrip("\n") + "\n" + block + after.lstrip("\n")
elif text:
    updated = text.rstrip("\n") + "\n\n" + block
else:
    updated = block
profile.parent.mkdir(parents=True, exist_ok=True)
profile.write_text(updated, encoding="utf-8")
PY
  echo "bootstrap-ai-helpers.sh: added $bin_dir to PATH in $profile" >&2
}

aih_refuse_dirty_central() {
  if [ -n "$(git -C "$CENTRAL" status --porcelain)" ]; then
    echo "bootstrap-ai-helpers.sh: $CENTRAL has local changes; clean it or set AI_HELPERS_HOME to another checkout" >&2
    git -C "$CENTRAL" status --short >&2
    exit 1
  fi
}

aih_ci_runtime() {
  [ "${CI:-}" = "true" ] ||
    [ "${GITHUB_ACTIONS:-}" = "true" ] ||
    [ "${GITLAB_CI:-}" = "true" ]
}

# Existing valid central checkouts are operator-managed. Bootstrap clones or
# repairs missing central locations. CI refreshes a clean sibling checkout to
# the declared ref before sync so persistent runners cannot use stale helpers.
CENTRAL=$(aih_find_central 2>/dev/null || true)
if [ -n "$CENTRAL" ] && aih_ci_runtime; then
  CENTRAL_ROOT=$(git -C "$CENTRAL" rev-parse --show-toplevel 2>/dev/null || true)
  PROJECT_GIT_ROOT=$(git -C "$PROJECT_ROOT" rev-parse --show-toplevel 2>/dev/null || true)
  if [ -n "$CENTRAL_ROOT" ] && [ "$CENTRAL_ROOT" != "$PROJECT_GIT_ROOT" ]; then
    GIT_REPO=$(aih_git_repo)
    aih_refuse_dirty_central
    git -C "$CENTRAL" fetch --prune "$GIT_REPO" "$AI_HELPERS_REF"
    git -C "$CENTRAL" checkout "$AI_HELPERS_REF"
    git -C "$CENTRAL" pull --ff-only "$GIT_REPO" "$AI_HELPERS_REF"
  fi
fi
if [ -z "$CENTRAL" ]; then
  command -v git >/dev/null 2>&1 || {
    echo "bootstrap-ai-helpers.sh: git is required to clone AI_Helpers" >&2
    exit 1
  }
  CENTRAL=$(aih_bootstrap_target)
  if [ -e "$CENTRAL" ] && [ ! -d "$CENTRAL/.git" ]; then
    echo "bootstrap-ai-helpers.sh: $CENTRAL exists but is not an AI_Helpers git checkout" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$CENTRAL")"
  GIT_REPO=$(aih_git_repo)
  if [ -d "$CENTRAL/.git" ]; then
    aih_refuse_dirty_central
    git -C "$CENTRAL" fetch --prune "$GIT_REPO" "$AI_HELPERS_REF"
    git -C "$CENTRAL" checkout "$AI_HELPERS_REF"
    git -C "$CENTRAL" pull --ff-only "$GIT_REPO" "$AI_HELPERS_REF"
  else
    git clone "$GIT_REPO" "$CENTRAL"
    git -C "$CENTRAL" remote set-url origin "$AI_HELPERS_REPO"
    git -C "$CENTRAL" checkout "$AI_HELPERS_REF"
  fi
fi

AIH="$CENTRAL/bin/aih"
if [ ! -x "$AIH" ]; then
  echo "bootstrap-ai-helpers.sh: missing executable $AIH" >&2
  exit 1
fi
aih_ensure_on_path

if "$AIH" sync --project-root "$PROJECT_ROOT" &&
   "$AIH" doctor --project-root "$PROJECT_ROOT"; then
  exit 0
else
  STATUS=$?
fi

if [ -d "$CENTRAL/.git" ]; then
  command -v git >/dev/null 2>&1 || exit "$STATUS"
  echo "bootstrap-ai-helpers.sh: refreshing AI_Helpers checkout after failed validation" >&2
  GIT_REPO=$(aih_git_repo)
  aih_refuse_dirty_central
  git -C "$CENTRAL" fetch --prune "$GIT_REPO" "$AI_HELPERS_REF"
  git -C "$CENTRAL" checkout "$AI_HELPERS_REF"
  git -C "$CENTRAL" pull --ff-only "$GIT_REPO" "$AI_HELPERS_REF"
  AIH="$CENTRAL/bin/aih"
  if [ ! -x "$AIH" ]; then
    echo "bootstrap-ai-helpers.sh: missing executable $AIH" >&2
    exit 1
  fi
  aih_ensure_on_path
  "$AIH" sync --project-root "$PROJECT_ROOT"
  exec "$AIH" doctor --project-root "$PROJECT_ROOT"
fi

exit "$STATUS"
