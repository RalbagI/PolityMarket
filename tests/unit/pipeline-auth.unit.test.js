// Regression tests for scripts/run-daily-pipeline.sh auth wiring.
//
// Background: On 2026-04-21 the nightly pipeline was silently skipped because
// `git fetch origin main` ran unauthenticated. The script relied on the global
// `gh auth git-credential` helper, which reads from the GNOME keyring — a
// resource the systemd user manager cannot reach when launched headless.
// `GIT_TERMINAL_PROMPT=0` then turned the missing prompt into exit 128.
//
// The fix resolves a token up-front (GITHUB_TOKEN env var, falling back to
// `gh auth token`) and exports GIT_ASKPASS so every git network call is
// authenticated. These static checks guard against regressions in that wiring.

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
  it("defines a resolve_github_token helper", () => {
    expect(script).toMatch(/resolve_github_token\s*\(\s*\)\s*\{/);
  });

  it("falls back from $GITHUB_TOKEN to `gh auth token`", () => {
    const helperStart = script.indexOf("resolve_github_token()");
    const helperEnd = script.indexOf("\n}", helperStart);
    const helperBody = script.slice(helperStart, helperEnd);
    expect(helperBody).toMatch(/GITHUB_TOKEN:-/);
    expect(helperBody).toMatch(/gh auth token/);
  });

  it("aborts with a clear message when no token can be resolved", () => {
    expect(script).toMatch(/No GitHub token available/);
    // Message must point the operator at the env file to fix it.
    expect(script).toMatch(/GITHUB_TOKEN=.*\$\{ENV_FILE\}/);
  });

  it("exports GIT_ASKPASS before the first git fetch/pull/push", () => {
    const askpassLine = firstLineMatching(/^\s*export\s+GIT_ASKPASS=/);
    const firstNetLine = firstLineMatching(/^\s*git\s+(fetch|pull|push)\b/);
    expect(askpassLine).toBeTruthy();
    expect(firstNetLine).toBeTruthy();
    expect(askpassLine).toBeLessThan(firstNetLine);
  });

  it("cleans up the askpass file on exit", () => {
    const cleanupStart = script.indexOf("cleanup()");
    const cleanupEnd = script.indexOf("\n}", cleanupStart);
    const cleanupBody = script.slice(cleanupStart, cleanupEnd);
    expect(cleanupBody).toMatch(/rm -f "\$\{ASKPASS_FILE:?-?[^}]*\}"/);
  });

  it("keeps GIT_TERMINAL_PROMPT disabled so credential failures are loud", () => {
    expect(script).toMatch(/export\s+GIT_TERMINAL_PROMPT=0/);
  });

  it("does not run any git fetch/pull/push before the token is resolved", () => {
    const resolveLine = firstLineMatching(/RESOLVED_TOKEN="\$\(resolve_github_token/);
    const firstNetLine = firstLineMatching(/^\s*git\s+(fetch|pull|push)\b/);
    expect(resolveLine).toBeTruthy();
    expect(firstNetLine).toBeTruthy();
    expect(resolveLine).toBeLessThan(firstNetLine);
  });

  it("drops the token from the shell env after wiring GIT_ASKPASS so subprocesses don't inherit it", () => {
    // Guard against regressing to `export GITHUB_TOKEN=...`, which would leak
    // the token into every child (npm ci, node, npx, curl).
    const askpassLine = firstLineMatching(/^\s*export\s+GIT_ASKPASS=/);
    const unsetLine = firstLineMatching(/^\s*unset\s+.*\bGITHUB_TOKEN\b/);
    expect(askpassLine).toBeTruthy();
    expect(unsetLine).toBeTruthy();
    expect(unsetLine).toBeGreaterThan(askpassLine);
    // The script must never `export GITHUB_TOKEN=` (only assign it locally).
    expect(script).not.toMatch(/^\s*export\s+GITHUB_TOKEN=/m);
  });

  it("installs the askpass file only after the cleanup trap is armed", () => {
    // Closes the leak window where an early failure left the helper in /tmp.
    const trapLine = firstLineMatching(/^\s*trap\s+cleanup\s+EXIT\b/);
    const askpassCreate = firstLineMatching(/^\s*ASKPASS_FILE="\$\(mktemp\)"/);
    expect(trapLine).toBeTruthy();
    expect(askpassCreate).toBeTruthy();
    expect(askpassCreate).toBeGreaterThan(trapLine);
  });
});
