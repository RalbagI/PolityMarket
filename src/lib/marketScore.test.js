import { describe, expect, it } from "vitest";
import { MARKET_NEUTRAL_RAW_SCORE } from "../../data-pipeline/lib/computeScore.js";
import {
  annotateMarketTimeline,
  computeMarketScore,
  getMarketTier,
  getRollingMarketBounds,
  resolveDisplayScore,
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

  it("uses min with padding when all scores are above neutral", () => {
    const bounds = getRollingMarketBounds(
      [MARKET_NEUTRAL_RAW_SCORE + 0.2, MARKET_NEUTRAL_RAW_SCORE + 0.5],
      MARKET_NEUTRAL_RAW_SCORE
    );

    // low = min - 5% of range = (neutral+0.2) - 0.05*0.3
    expect(bounds.low).toBeCloseTo(MARKET_NEUTRAL_RAW_SCORE + 0.2 - 0.015, 5);
  });

  it("uses max with padding when all scores are below neutral", () => {
    const bounds = getRollingMarketBounds(
      [MARKET_NEUTRAL_RAW_SCORE - 0.5, MARKET_NEUTRAL_RAW_SCORE - 0.2],
      MARKET_NEUTRAL_RAW_SCORE
    );

    // high = max + 5% of range = (neutral-0.2) + 0.05*0.3
    expect(bounds.high).toBeCloseTo(MARKET_NEUTRAL_RAW_SCORE - 0.2 + 0.015, 5);
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

  it("keeps the observed daily min and max away from exact 0 and 100 when using padded bounds", () => {
    const bounds = getRollingMarketBounds([4.2, 4.8, 5.7, 6.3, 7.1], MARKET_NEUTRAL_RAW_SCORE);

    expect(computeMarketScore(4.2, bounds)).toBeGreaterThan(0);
    expect(computeMarketScore(7.1, bounds)).toBeLessThan(100);
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

  it("suppresses deltas when the previous sample is not the prior calendar day", () => {
    const rows = annotateMarketTimeline([
      {
        date: "2026-03-16",
        politician_id: "gap",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 0.2,
      },
      {
        date: "2026-03-18",
        politician_id: "gap",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 0.8,
      },
    ]);

    const secondRow = rows.find((row) => row.date === "2026-03-18" && row.politician_id === "gap");

    expect(secondRow.market_delta_points).toBeNull();
    expect(secondRow.market_delta_pct).toBeNull();
  });

  it("decays neutral raw scores toward 50 instead of snapping immediately to the midpoint", () => {
    const rows = annotateMarketTimeline([
      {
        date: "2026-03-21",
        politician_id: "drift",
        overall_score: MARKET_NEUTRAL_RAW_SCORE + 1.8,
      },
      {
        date: "2026-03-22",
        politician_id: "drift",
        overall_score: MARKET_NEUTRAL_RAW_SCORE,
      },
    ]);

    const firstDay = rows.find((row) => row.date === "2026-03-21" && row.politician_id === "drift");
    const secondDay = rows.find(
      (row) => row.date === "2026-03-22" && row.politician_id === "drift"
    );

    expect(firstDay.market_score).toBeGreaterThan(50);
    expect(secondDay.market_score).toBeGreaterThan(50);
    expect(secondDay.market_score).toBeLessThan(firstDay.market_score);
    expect(secondDay.market_score).not.toBe(50);
  });
});

describe("resolveDisplayScore", () => {
  it("prefers market_score when present", () => {
    expect(resolveDisplayScore({ market_score: 73.4, overall_score: 6.1 })).toBe(73);
  });

  it("falls back to overall_score * 10 when market_score is missing", () => {
    expect(resolveDisplayScore({ overall_score: 6.15 })).toBe(62);
  });

  it("returns null when both scores are missing", () => {
    expect(resolveDisplayScore({})).toBeNull();
    expect(resolveDisplayScore(null)).toBeNull();
  });
});
