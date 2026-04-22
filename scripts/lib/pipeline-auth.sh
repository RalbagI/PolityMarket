#!/usr/bin/env bash
# Helpers for unattended git auth in the nightly pipeline. Sourced by
# scripts/run-daily-pipeline.sh and by tests/unit/pipeline-auth-runtime.unit.test.js
# — keep functions self-contained so they can be exercised in isolation.
#
# Design notes:
# - GIT_ASKPASS must NOT be exported. When the env var is present for any
#   subprocess, that subprocess can `cat "$GIT_ASKPASS"` and recover the baked
#   token. Callers scope it per git network command: `GIT_ASKPASS=... git fetch`.
# - The token is baked directly into the helper file (chmod 700, owner-only)
#   so the parent shell doesn't need to keep GITHUB_TOKEN in its env.
# - SSH remotes skip the whole flow; SSH keys are handled by ssh-agent.

# is_https_remote: returns 0 if origin is an https:// URL, 1 otherwise.
is_https_remote() {
  local url
  url="$(git remote get-url origin 2>/dev/null || printf '')"
  [[ "${url}" == https://* ]]
}

# resolve_github_token: prints a token to stdout and returns 0, or returns 1
# if no source is available. Prefers an explicit GITHUB_TOKEN env var, then
# falls back to `gh auth token` (which works only when the current session can
# reach the same keyring as the gh CLI).
resolve_github_token() {
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    printf '%s' "${GITHUB_TOKEN}"
    return 0
  fi
  if command -v gh &>/dev/null; then
    local tok
    if tok="$(gh auth token 2>/dev/null)" && [[ -n "${tok}" ]]; then
      printf '%s' "${tok}"
      return 0
    fi
  fi
  return 1
}

# create_askpass_helper TOKEN
# Writes a bash askpass helper (chmod 700) that answers git's Username/Password
# prompts with x-access-token / TOKEN. Prints the helper path on stdout.
# Tokens are expected to be ASCII-alphanumeric (GitHub PATs) so heredoc
# interpolation is safe.
create_askpass_helper() {
  local tok="$1"
  local askpass_file
  askpass_file="$(mktemp)"
  chmod 600 "${askpass_file}"
  cat > "${askpass_file}" <<EOF
#!/usr/bin/env bash
case "\$1" in
  *Username*) printf '%s\n' "x-access-token" ;;
  *Password*) printf '%s\n' "${tok}" ;;
  *) printf '\n' ;;
esac
EOF
  chmod 700 "${askpass_file}"
  printf '%s' "${askpass_file}"
}
