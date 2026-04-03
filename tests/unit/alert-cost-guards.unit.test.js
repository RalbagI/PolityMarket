import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexSource = fs.readFileSync(path.join(__dirname, "../../functions/index.js"), "utf-8");
const triggerAlertsSource = fs.readFileSync(
  path.join(__dirname, "../../functions/lib/triggerAlerts.js"),
  "utf-8"
);

describe("Cloud Functions — alert freshness and legacy subscription guards", () => {
  it("bypasses hosting cache when trigger-alerts fetches hosted JSON", () => {
    expect(triggerAlertsSource).toMatch(
      /buildHostedDataUrl\("volatility_data\.json", \{ bustCache: true \}\)/
    );
    expect(triggerAlertsSource).toMatch(/cache:\s*"no-store"/);
  });

  it("matches legacy subscription emails by normalized value before creating a new doc", () => {
    expect(indexSource).toMatch(/allowLegacyNormalizedScan:\s*true/);
    expect(indexSource).toMatch(/normalizeEmail\(doc\.data\(\)\?\.email\)\s*===\s*normalizedEmail/);
  });
});
