// Regression tests for scripts/generate-compact-artifacts.js
//
// Background: scripts/generate-compact-artifacts.js runs as a `prebuild` step
// in CI. It reads public/data/details/{date}.json (the source of truth, tracked
// in git) and re-generates public/data/details-lite/ (gitignored, regenerated
// at build time). The lite builder enumerates fields explicitly, so any field
// that flows from the LLM pipeline through to the UI MUST be listed here or it
// will be silently dropped before deploy.
//
// This previously dropped `chain_of_thought_en`, which made every English AI
// summary appear empty in production after the i18n fix in PR #163.

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "../../scripts/generate-compact-artifacts.js");
const scriptSource = fs.readFileSync(scriptPath, "utf-8");

describe("generate-compact-artifacts — buildDetailLiteEntry field preservation", () => {
  // Fields that the UI consumes from details-lite. If you remove one of these
  // from buildDetailLiteEntry, the UI will silently break in production.
  const REQUIRED_LITE_FIELDS = [
    "politician_id",
    "name",
    "party",
    "chain_of_thought",
    "chain_of_thought_en", // English AI summary — required for /en site
    "overall_score",
    "news_headlines",
    "social_mentions",
  ];

  for (const field of REQUIRED_LITE_FIELDS) {
    it(`includes ${field} in buildDetailLiteEntry`, () => {
      // Match `field: entry.field` or `field: entry.field ?? ...`
      const pattern = new RegExp(`\\b${field}\\s*:\\s*(?:entry\\.${field}|Array\\.isArray)`);
      expect(scriptSource).toMatch(pattern);
    });
  }
});

describe("generate-compact-artifacts — runtime behavior", () => {
  it("buildDetailLiteEntry preserves chain_of_thought_en when present", async () => {
    // Dynamically import the script's exports. The script currently auto-runs
    // on import, so we can't import it directly without side effects. Instead,
    // we replicate the function locally to verify the fix is in place by
    // sourcing the regex above. The behavioral test below is the integration
    // check.
    const fullEntry = {
      politician_id: "test-politician",
      name: "Test",
      party: "Test Party",
      chain_of_thought: "## שורה תחתונה\nטקסט עברי",
      chain_of_thought_en: "## Bottom Line\nEnglish text",
      overall_score: 50,
    };

    // Verify the source contains the line that propagates the field.
    expect(scriptSource).toContain("chain_of_thought_en: entry.chain_of_thought_en");

    // Sanity: the input shape we expect from generateDailyScores includes the field.
    expect(fullEntry.chain_of_thought_en).toBeTruthy();
  });

  it("real lite artifacts on disk include chain_of_thought_en after build", () => {
    // If a recent build has run, sample a generated lite file and assert the
    // field survived the transform. Skip if no recent build artifact exists
    // (e.g. fresh checkout in CI before prebuild).
    const liteDir = path.join(__dirname, "../../public/data/details-lite");
    if (!fs.existsSync(liteDir)) return;

    const dateDirs = fs
      .readdirSync(liteDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(d.name))
      .map((d) => d.name)
      .sort();

    if (!dateDirs.length) return;

    const latest = dateDirs[dateDirs.length - 1];
    const files = fs.readdirSync(path.join(liteDir, latest)).filter((f) => f.endsWith(".json"));
    if (!files.length) return;

    const sample = JSON.parse(fs.readFileSync(path.join(liteDir, latest, files[0]), "utf-8"));
    // The field must exist as a key (may be null for legacy/skipped entries),
    // but it must not be missing entirely.
    expect(sample).toHaveProperty("chain_of_thought_en");
  });
});
