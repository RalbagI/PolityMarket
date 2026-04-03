import { describe, expect, it } from "vitest";
import { MARKET_NEUTRAL_RAW_SCORE } from "../../data-pipeline/lib/computeScore.js";
import {
  annotateMarketTimeline,
  computeMarketScore,
  getMarketTier,
  getRollingMarketBounds,
} from "./marketScore";

describe("marketScore helpers", () => {
  it("maps the neutral baseline to 50", () => {
    const bounds = {
      low: MARKET_NEUTRAL_RAW_SCORE - 1,
      high: MARKET_NEUTRAL_RAW_SCORE + 1,
      neutralRaw: MARKET_NEUTRAL_RAW_SCORE,
    };

    expect(computeMarketScore(MARKET_NEUTRAL_RAW_SCORE, bounds)).toBe(50);
  });

  it("falls back to the rolling min when p5 collapses above neutral", () => {
    const bounds = getRollingMarketBounds(
      [MARKET_NEUTRAL_RAW_SCORE + 0.2, MARKET_NEUTRAL_RAW_SCORE + 0.5],
      MARKET_NEUTRAL_RAW_SCORE
    );

    expect(bounds.low).toBe(MARKET_NEUTRAL_RAW_SCORE + 0.2);
  });

  it("falls back to the rolling max when p95 collapses below neutral", () => {
    const bounds = getRollingMarketBounds(
      [MARKET_NEUTRAL_RAW_SCORE - 0.5, MARKET_NEUTRAL_RAW_SCORE - 0.2],
      MARKET_NEUTRAL_RAW_SCORE
    );

    expect(bounds.high).toBe(MARKET_NEUTRAL_RAW_SCORE - 0.2);
  });

  it("clamps scores outside the bounds to 0-100", () => {
    const bounds = {
      low: MARKET_NEUTRAL_RAW_SCORE - 1,
      high: MARKET_NEUTRAL_RAW_SCORE + 1,
      neutralRaw: MARKET_NEUTRAL_RAW_SCORE,
    };

    expect(computeMarketScore(MARKET_NEUTRAL_RAW_SCORE - 2, bounds)).toBe(0);
    expect(computeMarketScore(MARKET_NEUTRAL_RAW_SCORE + 2, bounds)).toBe(100);
  });

  it("assigns tiers from the market score thresholds", () => {
    expect(getMarketTier(90)).toBe("S");
    expect(getMarketTier(70)).toBe("A");
    expect(getMarketTier(50)).toBe("B");
    expect(getMarketTier(20)).toBe("C");
  });

  it("computes tied-average percentiles by day", () => {
    const rows = annotateMarketTimeline([
      {
        date: "2026-03-21",
        politician_id: "a",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 0.8,
      },
      {
        date: "2026-03-21",
        politician_id: "b",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 0.8,
      },
      {
        date: "2026-03-21",
        politician_id: "c",
        overall_score: MARKET_NEUTRAL_RAW_SCORE - 0.2,
      },
    ]);

    const percentileById = Object.fromEntries(
      rows.map((row) => [row.politician_id, row.market_percentile])
    );

    expect(percentileById.a).toBe(75);
    expect(percentileById.b).toBe(75);
    expect(percentileById.c).toBe(0);
  });

  it("computes point deltas and suppresses percent delta when the previous score is too low", () => {
    const rows = annotateMarketTimeline([
      {
        date: "2026-03-21",
        politician_id: "high",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 1,
      },
      {
        date: "2026-03-21",
        politician_id: "low",
        overall_score: MARKET_NEUTRAL_RAW_SCORE - 1,
      },
      {
        date: "2026-03-22",
        politician_id: "high",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 0.8,
      },
      {
        date: "2026-03-22",
        politician_id: "low",
        overall_score: MARKET_NEUTRAL_RAW_SCORE - 0.6,
      },
    ]);

    const highDayTwo = rows.find(
      (row) => row.date === "2026-03-22" && row.politician_id === "high"
    );
    const lowDayTwo = rows.find((row) => row.date === "2026-03-22" && row.politician_id === "low");

    expect(highDayTwo.market_delta_points).toBeLessThan(0);
    expect(typeof highDayTwo.market_delta_pct).toBe("number");
    expect(lowDayTwo.market_delta_points).toBeGreaterThan(0);
    expect(lowDayTwo.market_delta_pct).toBeNull();
  });
});
