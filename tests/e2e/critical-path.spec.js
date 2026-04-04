import { test, expect } from "@playwright/test";

const summaryFixture = [
  {
    date: "2026-03-28",
    politician_id: "yoav-test",
    name: "יואב מבחן",
    party: "מפלגת בדיקה",
    overall_score: 6.9,
    media_volume: 95,
  },
  {
    date: "2026-03-29",
    politician_id: "yoav-test",
    name: "יואב מבחן",
    party: "מפלגת בדיקה",
    overall_score: 8.1,
    media_volume: 120,
  },
  {
    date: "2026-03-28",
    politician_id: "dana-test",
    name: "דנה דוגמה",
    party: "מפלגת דוגמה",
    overall_score: 7.3,
    media_volume: 85,
  },
  {
    date: "2026-03-29",
    politician_id: "dana-test",
    name: "דנה דוגמה",
    party: "מפלגת דוגמה",
    overall_score: 6.2,
    media_volume: 80,
  },
];

const detailFixture = [
  {
    date: "2026-03-29",
    politician_id: "yoav-test",
    name: "יואב מבחן",
    party: "מפלגת בדיקה",
    overall_score: 8.1,
    chain_of_thought: "ניתוח בדיקה למטרת E2E",
    news_headlines: ["כותרת בדיקה"],
    social_mentions: [{ text: "אזכור בדיקה", thread_context: [] }],
    dim_public_sentiment: 0.76,
    dim_parliamentary_activity: 0.7,
    dim_media_credibility: 0.66,
    dim_transparency_ethics: 0.72,
    dim_field_activity: 0.8,
    dim_satire_cultural_impact: 0.55,
    dim_legislative_quality: 0.64,
    dim_flipflop_index: 0.2,
  },
];

test("critical path: load dashboard and open details panel", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("politymarket-cookie-consent", "accepted");
  });

  await page.route("**/data/timeseries_summary.compact.json", async (route) => {
    await route.fulfill({ json: summaryFixture });
  });

  await page.route("**/data/party_summary.json", async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route("**/data/details-lite/*.json", async (route) => {
    await route.fulfill({ json: detailFixture });
  });

  await page.goto("/");

  const topMoverButton = page.getByRole("button", { name: /יואב מבחן: \+6\.9/i });
  await expect(topMoverButton).toBeVisible();

  await topMoverButton.click();

  const detailsPanel = page.getByRole("dialog");
  await expect(detailsPanel).toBeVisible();
  // Detail panel shows market score (0-100 scale) in the large score display
  await expect(detailsPanel.locator(".text-3xl").getByText("99")).toBeVisible();
});
