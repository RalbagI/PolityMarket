import { describe, expect, it } from "vitest";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  validateWorkflowStorage,
  validateWorkflowDirectory,
} from "../../scripts/validate-ci-storage.js";

describe("immutable E2E source build without cloud artifact transport", () => {
  it("retains CodeQL analysis and security results without source database or dependency archives", () => {
    const workflow = readFileSync(".github/workflows/codeql.yml", "utf8");
    expect(workflow).toContain("github/codeql-action/init@v4");
    expect(workflow).toContain("github/codeql-action/analyze@v4");
    expect(workflow).toContain("security-events: write");
    expect(workflow).toMatch(/dependency-caching:\s*false/);
    expect(workflow).toMatch(/upload-database:\s*false/);
    expect(workflow).not.toMatch(/upload:\s*false/);
  });
  it("builds inside the E2E shard and keeps all native test/build gates", () => {
    const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
    const e2e = workflow.slice(workflow.indexOf("  e2e_tests:"));
    expect(e2e).toContain("run: npm run build");
    expect(e2e.indexOf("run: npm run build")).toBeLessThan(e2e.indexOf("npm run test:e2e"));
    expect(e2e).toContain("github.event.pull_request.head.sha || github.sha");
    for (const gate of [
      "npm run test:unit",
      "npm run test:component",
      "npm run test:integration:coverage",
      "npm run security:audit",
      "Chunks exceed 500KB",
    ])
      expect(workflow).toContain(gate);
    expect(workflow).not.toMatch(/upload-artifact|download-artifact|cache:\s*npm/);
  });
});

describe("actual CI storage enforcer", () => {
  it("rejects archived transport and missing CodeQL retention flags while allowing security analysis", () => {
    for (const text of [
      "uses: actions/upload-artifact@v4",
      "uses: actions/download-artifact@v4",
      "uses: actions/cache@v4",
      "cache: npm",
      "gh run download 1",
      "gh release upload v1 file",
    ])
      expect(() => validateWorkflowStorage(text)).toThrow();
    expect(() => validateWorkflowStorage("uses: github/codeql-action/analyze@v4")).toThrow();
    expect(() => validateWorkflowStorage("uses: github/codeql-action/init@v4")).toThrow();
    expect(() =>
      validateWorkflowStorage(
        "uses: github/codeql-action/init@v4\ndependency-caching: false\nuses: github/codeql-action/analyze@v4\nupload-database: false\nsecurity-events: write"
      )
    ).not.toThrow();
  });
  it("checks YAML files while ignoring subdirectories and non-workflow files", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "ci-storage-"));
    try {
      mkdirSync(path.join(directory, "ignored"));
      writeFileSync(path.join(directory, "notes.txt"), "uses: actions/upload-artifact@v4");
      writeFileSync(path.join(directory, "ci.yaml"), "run: npm test");
      expect(() => validateWorkflowDirectory(directory)).not.toThrow();
      writeFileSync(path.join(directory, "ci.yaml"), "uses: actions/upload-artifact@v4");
      expect(() => validateWorkflowDirectory(directory)).toThrow();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
