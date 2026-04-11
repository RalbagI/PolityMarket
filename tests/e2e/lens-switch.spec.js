import { test, expect } from "@playwright/test";

// Three politicians constructed so that:
//   - yoav-test   has a large POSITIVE delta AND mid-range volume — should
//                 dominate the momentum lens because |delta| z-score is huge.
//   - dana-test   has zero delta but the largest media volume — should
//                 dominate the market lens because sizeBy defaults to volume.
//   - calm-test   is a small-delta, small-volume filler so the visible set
//                 has n=3 and z-scores don't pathologically cancel between
//                 two entries.
// If the tile area order is identical under both lenses, the treemap isn't
// actually branching on treemapLens — and the whole point of PR-1 is gone.
function timelineRows(politicianId, name, party, overall, volume, delta) {
  const base = {
    politician_id: politicianId,
    name,
    party,
    overall_score: overall,
    market_score: overall * 10,
    market_delta_points: 0,
    media_volume: volume,
    dim_public_sentiment: 0.5,
  };
  return [
    { ...base, date: "2026-04-04" },
    { ...base, date: "2026-04-05", market_delta_points: delta },
  ];
}

const summaryFixture = [
  ...timelineRows("yoav-test", "יואב מבחן", "מפלגת בדיקה", 7.5, 80, 25),
  ...timelineRows("dana-test", "דנה דוגמה", "מפלגת דוגמה", 8.9, 200, 0),
  ...timelineRows("calm-test", "נח שקט", "מפלגת שקט", 5.0, 10, 0),
];

test("lens toggle reorders the treemap between momentum and market", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("politymarket-cookie-consent", "accepted");
  });

  await page.route("**/data/timeseries_summary.compact.json", async (route) => {
    await route.fulfill({ json: summaryFixture });
  });
  await page.route("**/data/party_summary.json", async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.route("**/data/volatility_data.json", async (route) => {
    await route.fulfill({ json: { politicians: {} } });
  });
  await page.route("**/data/bottom_lines.json", async (route) => {
    await route.fulfill({ json: { bottom_lines: [] } });
  });
  await page.route("**/data/details-lite/**", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto("/");

  // Wait for the fixture politicians to land as tile buttons.
  await expect(page.getByRole("button", { name: /יואב/ }).first()).toBeVisible({ timeout: 15000 });

  async function tileFingerprint() {
    // Serialize the position + size of every fixture tile so we can detect
    // whether the treemap re-laid out after the lens change. Stable against
    // D3 layout quirks for small n because we compare full boxes, not ranks.
    const names = ["יואב", "דנה", "נח"];
    const parts = [];
    for (const name of names) {
      const tile = page.getByRole("button", { name: new RegExp(name) }).first();
      const box = await tile.boundingBox();
      if (!box) return null;
      parts.push(
        `${name}:${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)}x${Math.round(
          box.height
        )}`
      );
    }
    return parts.join("|");
  }

  const momentumButton = page.getByRole("button", { name: "תנועה", exact: true });
  const marketButton = page.getByRole("button", { name: "שוק", exact: true });

  // Default lens is `momentum`: the Momentum button carries the active
  // highlight and the treemap is painted under the momentum rules.
  await expect(momentumButton).toHaveClass(/bg-indigo-600/);
  const momentumFingerprint = await tileFingerprint();
  expect(momentumFingerprint).not.toBeNull();

  // Switch to the market lens via the sidebar toggle.
  await marketButton.click();

  // The active class must transfer to the Market button — this is what a
  // broken lens toggle would fail on.
  await expect(marketButton).toHaveClass(/bg-gray-700/);

  const marketFingerprint = await tileFingerprint();
  expect(marketFingerprint).not.toBeNull();

  // The tile layout must differ — if the lens toggle is a no-op, the
  // treemap renders identical boxes and the fingerprints are equal.
  expect(marketFingerprint).not.toBe(momentumFingerprint);
});
