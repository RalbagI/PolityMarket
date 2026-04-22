/* global process */
// Runtime tests for scripts/lib/pipeline-auth.sh.
//
// These spawn real bash subprocesses against the sourceable auth lib so typos
// and bash-compat regressions in the heredoc, `command -v`, or the helper's
// $1-case dispatch get caught instead of just the string-shape guard in
// pipeline-auth.unit.test.js.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const libPath = path.join(repoRoot, "scripts/lib/pipeline-auth.sh");

// Use a fresh PATH that excludes /home/linuxbrew/.linuxbrew/bin so the `gh`
// fallback is deterministically unavailable in the negative-case test. Core
// binaries stay reachable.
const minimalPath = "/usr/bin:/bin";

function runBash(body, env = {}) {
  return spawnSync("bash", ["-c", `set -euo pipefail\nsource "${libPath}"\n${body}`], {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

describe("scripts/lib/pipeline-auth.sh — resolve_github_token", () => {
  it("prefers $GITHUB_TOKEN when present", () => {
    const res = runBash("resolve_github_token", {
      GITHUB_TOKEN: "env-token-xyz",
      PATH: minimalPath,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toBe("env-token-xyz");
  });

  it("returns non-zero with empty stdout when no token source is available", () => {
    const res = runBash("resolve_github_token || echo 'NO_TOKEN'", {
      GITHUB_TOKEN: "",
      PATH: minimalPath,
    });
    expect(res.status).toBe(0); // `|| echo` rescues the overall command
    expect(res.stdout.trim()).toBe("NO_TOKEN");
  });
});

describe("scripts/lib/pipeline-auth.sh — create_askpass_helper", () => {
  let createdHelper = null;

  afterAll(() => {
    if (createdHelper && fs.existsSync(createdHelper)) fs.unlinkSync(createdHelper);
  });

  it("writes an owner-only helper that answers Username/Password prompts", () => {
    const token = "test-pat-" + Math.random().toString(36).slice(2, 10);
    const res = runBash(
      `
        helper="$(create_askpass_helper "${token}")"
        echo "HELPER=${"$"}helper"
        stat -c '%a' "${"$"}helper"
        "${"$"}helper" "Username for https://github.com:"
        "${"$"}helper" "Password for https://x-access-token@github.com:"
      `,
      { PATH: minimalPath }
    );
    expect(res.status).toBe(0);
    const out = res.stdout.split("\n");
    const helperLine = out.find((l) => l.startsWith("HELPER="));
    createdHelper = helperLine.slice("HELPER=".length);
    const perms = out[1];
    const usernameAnswer = out[2];
    const passwordAnswer = out[3];
    expect(perms).toBe("700");
    expect(usernameAnswer).toBe("x-access-token");
    expect(passwordAnswer).toBe(token);
  });
});

describe("scripts/lib/pipeline-auth.sh — is_https_remote", () => {
  let tmpRepo;

  beforeAll(() => {
    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), "pm-auth-test-"));
    spawnSync("git", ["-C", tmpRepo, "init", "-q"], { encoding: "utf8" });
  });

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it("detects https:// remotes as HTTPS", () => {
    spawnSync("git", ["-C", tmpRepo, "remote", "remove", "origin"], { encoding: "utf8" });
    spawnSync("git", ["-C", tmpRepo, "remote", "add", "origin", "https://github.com/foo/bar.git"], {
      encoding: "utf8",
    });
    const res = runBash(`cd "${tmpRepo}"; is_https_remote && echo YES || echo NO`, {
      PATH: minimalPath,
    });
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe("YES");
  });

  it("rejects SSH remotes", () => {
    spawnSync("git", ["-C", tmpRepo, "remote", "remove", "origin"], { encoding: "utf8" });
    spawnSync("git", ["-C", tmpRepo, "remote", "add", "origin", "git@github.com:foo/bar.git"], {
      encoding: "utf8",
    });
    const res = runBash(`cd "${tmpRepo}"; is_https_remote && echo YES || echo NO`, {
      PATH: minimalPath,
    });
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe("NO");
  });

  it("treats a repo with no origin as non-HTTPS", () => {
    spawnSync("git", ["-C", tmpRepo, "remote", "remove", "origin"], { encoding: "utf8" });
    const res = runBash(`cd "${tmpRepo}"; is_https_remote && echo YES || echo NO`, {
      PATH: minimalPath,
    });
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe("NO");
  });
});
