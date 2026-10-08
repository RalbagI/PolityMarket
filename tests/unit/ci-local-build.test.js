import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("immutable E2E source build without cloud artifact transport", () => {
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
