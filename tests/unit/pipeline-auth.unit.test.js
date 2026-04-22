// Static regression tests for scripts/run-daily-pipeline.sh auth wiring.
//
// Background: On 2026-04-21 the nightly pipeline was silently skipped because
// `git fetch origin main` ran unauthenticated. The script relied on the global
// `gh auth git-credential` helper, which reads from the GNOME keyring — a
// resource the systemd user manager cannot reach when launched headless.
// `GIT_TERMINAL_PROMPT=0` then turned the missing prompt into exit 128.
//
// The fix resolves a token up-front (GITHUB_TOKEN env var, falling back to
// `gh auth token`) and wires GIT_ASKPASS onto each git network call inline —
// GIT_ASKPASS must NOT be exported, because the path would then be visible to
// every subprocess that could `cat` the helper and recover the PAT.
//
// For runtime coverage of the auth helpers themselves, see
// tests/unit/pipeline-auth-runtime.unit.test.js.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "../../scripts/run-daily-pipeline.sh");
const script = fs.readFileSync(scriptPath, "utf-8");
const lines = script.split("\n");

const firstLineMatching = (regex) => lines.findIndex((line) => regex.test(line)) + 1 || null;

describe("run-daily-pipeline.sh — unattended git auth wiring", () => {
  it("sources the shared auth lib (resolve_github_token / create_askpass_helper / is_https_remote)", () => {
    expect(script).toMatch(/source\s+"\$\{SCRIPT_DIR\}\/lib\/pipeline-auth\.sh"/);
    expect(script).toMatch(/\bresolve_github_token\b/);
    expect(script).toMatch(/\bcreate_askpass_helper\b/);
    expect(script).toMatch(/\bis_https_remote\b/);
  });

  it("aborts with a clear message when no token can be resolved on an HTTPS remote", () => {
    expect(script).toMatch(/No GitHub token available/);
    // Message must point the operator at the env file to fix it.
    expect(script).toMatch(/GITHUB_TOKEN=.*\$\{ENV_FILE\}/);
  });

  it("keeps GIT_TERMINAL_PROMPT disabled so credential failures are loud", () => {
    expect(script).toMatch(/export\s+GIT_TERMINAL_PROMPT=0/);
  });

  it("never exports GIT_ASKPASS (subprocess leak: any child could cat the helper)", () => {
    expect(script).not.toMatch(/^\s*export\s+GIT_ASKPASS=/m);
    // And never exports GITHUB_TOKEN either.
    expect(script).not.toMatch(/^\s*export\s+GITHUB_TOKEN=/m);
  });

  it("prefixes every git fetch/pull/push with an inline GIT_ASKPASS assignment", () => {
    // A bare `git fetch|pull|push` at the start of a line means the command
    // ran without the token — subprocess leak on success, auth failure on an
    // HTTPS remote. The inline form `GIT_ASKPASS=... git push` keeps the env
    // var scoped to git's single child process.
    const bareNetLines = lines
      .map((line, idx) => ({ line, n: idx + 1 }))
      .filter(({ line }) => /^\s*git\s+(fetch|pull|push)\b/.test(line));
    expect(bareNetLines).toEqual([]);

    // At least one inline GIT_ASKPASS= git <op> must exist (proves the wiring
    // is actually in place, not just absent).
    const inlineCount = lines.filter((line) =>
      /\bGIT_ASKPASS="[^"]*"\s+git\s+(fetch|pull|push)\b/.test(line)
    ).length;
    expect(inlineCount).toBeGreaterThanOrEqual(1);
  });

  it("drops the token from the shell env after creating the askpass helper", () => {
    // Guard against regressing to `export GITHUB_TOKEN=...`, which would leak
    // the token into every child (npm ci, node, npx, curl).
    const createLine = firstLineMatching(/\bcreate_askpass_helper\b/);
    const unsetLine = firstLineMatching(/^\s*unset\s+.*\bGITHUB_TOKEN\b/);
    expect(createLine).toBeTruthy();
    expect(unsetLine).toBeTruthy();
    expect(unsetLine).toBeGreaterThan(createLine);
    expect(script).toMatch(/unset\s+RESOLVED_TOKEN\s+GITHUB_TOKEN/);
  });

  it("installs the askpass file only after the cleanup trap is armed", () => {
    // Closes the leak window where an early failure left the helper in /tmp.
    const trapLine = firstLineMatching(/^\s*trap\s+cleanup\s+EXIT\b/);
    const askpassCreate = firstLineMatching(/ASKPASS_FILE="\$\(create_askpass_helper/);
    expect(trapLine).toBeTruthy();
    expect(askpassCreate).toBeTruthy();
    expect(askpassCreate).toBeGreaterThan(trapLine);
  });

  it("drops the lock file on early exit too (EXIT in the pre-cleanup trap)", () => {
    // 2026-04-22 review: a failing token resolution raises `exit 1` before the
    // full cleanup trap is armed. Without EXIT in the early trap the lock file
    // would persist, blocking the next run with a stale PID.
    expect(script).toMatch(/trap\s+'rm\s+-f\s+"\$\{LOCK_FILE\}"'\s+INT\s+TERM\s+EXIT/);
  });

  it("only requires a token when origin is an HTTPS remote", () => {
    // If someone switches the remote to git@github.com:..., SSH keys handle
    // auth and the token-resolution branch must be skippable.
    expect(script).toMatch(/if\s+is_https_remote;\s*then/);
  });

  it("cleans up the askpass file on exit", () => {
    const cleanupStart = script.indexOf("cleanup()");
    const cleanupEnd = script.indexOf("\n}", cleanupStart);
    const cleanupBody = script.slice(cleanupStart, cleanupEnd);
    expect(cleanupBody).toMatch(/rm -f "\$\{ASKPASS_FILE\}"/);
  });
});
