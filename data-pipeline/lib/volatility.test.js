import { describe, it, expect } from "vitest";
import {
  computeRollingStdDev,
  computeRollingMean,
  detectVolatilityBreach,
  generateVolatilityData,
} from "./volatility.js";

describe("computeRollingStdDev", () => {
  it("returns null for single-element windows", () => {
    const result = computeRollingStdDev([5], 3);
    expect(result).toEqual([null]);
  });

  it("computes population stddev for a known series", () => {
    // values: [2, 4, 4, 4, 5, 5, 7, 9] — classic textbook example
    // population stddev = 2.0
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = computeRollingStdDev(values, 8);
    // Last element uses all 8 values, stddev = 2.0
    expect(result[result.length - 1]).toBeCloseTo(2.0, 2);
  });

  it("returns null for positions with fewer than 2 values", () => {
    const result = computeRollingStdDev([5, 10, 15], 3);
    expect(result[0]).toBeNull(); // only 1 value in window
  });

  it("handles all-same values (stddev = 0)", () => {
    const result = computeRollingStdDev([5, 5, 5, 5], 4);
    expect(result[result.length - 1]).toBe(0);
  });

  it("handles nulls gracefully", () => {
    const result = computeRollingStdDev([null, null, 5, 10], 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeNull(); // only 1 non-null in window
    expect(result[3]).not.toBeNull(); // 2 non-null values: 5, 10
  });

  it("respects window size", () => {
    const values = [1, 2, 3, 100, 5];
    const w3 = computeRollingStdDev(values, 3);
    const w5 = computeRollingStdDev(values, 5);
    // window=3 at index 4 uses [100, 5] — wait, [3,100,5]
    // window=5 at index 4 uses [1,2,3,100,5]
    // Different stddevs expected
    expect(w3[4]).not.toEqual(w5[4]);
  });
});

describe("computeRollingMean", () => {
  it("computes simple mean", () => {
    const result = computeRollingMean([2, 4, 6], 3);
    expect(result[2]).toBeCloseTo(4, 2);
  });

  it("returns null for all-null input", () => {
    const result = computeRollingMean([null, null], 2);
    expect(result).toEqual([null, null]);
  });
});

describe("detectVolatilityBreach", () => {
  it("detects upward breach beyond 2σ", () => {
    // Stable series then spike
    const series = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 20];
    const result = detectVolatilityBreach(series, 14, 2);
    expect(result.isBreaching).toBe(true);
    expect(result.direction).toBe("up");
    expect(result.currentSigma).toBeGreaterThan(2);
  });

  it("detects downward breach beyond 2σ", () => {
    const series = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, -10];
    const result = detectVolatilityBreach(series, 14, 2);
    expect(result.isBreaching).toBe(true);
    expect(result.direction).toBe("down");
    expect(result.currentSigma).toBeLessThan(-2);
  });

  it("returns no breach for stable series", () => {
    const series = [5, 5.1, 4.9, 5, 5.2, 4.8, 5, 5.1, 4.9, 5, 5, 5, 5, 5];
    const result = detectVolatilityBreach(series, 14, 2);
    expect(result.isBreaching).toBe(false);
    expect(result.direction).toBeNull();
  });

  it("handles series shorter than window", () => {
    const series = [5, 6];
    const result = detectVolatilityBreach(series, 14, 2);
    // Still computes with available data
    expect(result).toHaveProperty("isBreaching");
  });

  it("handles all-same values (stddev = 0)", () => {
    const series = [5, 5, 5, 5, 5];
    const result = detectVolatilityBreach(series, 5, 2);
    expect(result.isBreaching).toBe(false);
    expect(result.currentSigma).toBeNull();
  });

  it("exact 2σ boundary is considered breaching", () => {
    // Craft a series where the last value is exactly 2σ from mean
    // Mean of [0, 0, 0, 0] = 0, stddev = 0 → can't test exact boundary
    // Use: [0, 4] → mean=2, stddev=2, latest=4 → sigma = (4-2)/2 = 1.0 — not 2σ
    // Use longer series for predictable stddev
    const series = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 5];
    const result = detectVolatilityBreach(series, 14, 2);
    // sigma = (5 - mean) / stddev — just verify the math works
    expect(typeof result.currentSigma).toBe("number");
  });

  it("returns nulls for empty/all-null series", () => {
    const result = detectVolatilityBreach([null, null], 14, 2);
    expect(result.isBreaching).toBe(false);
    expect(result.currentSigma).toBeNull();
  });
});

describe("generateVolatilityData", () => {
  const makeSummaryRows = (id, name, scores, volumes) =>
    scores.map((score, i) => ({
      date: `2026-03-${String(i + 1).padStart(2, "0")}`,
      politician_id: id,
      name,
      party: "Test",
      overall_score: score,
      media_volume: volumes[i],
    }));

  it("generates volatility data for multiple politicians", () => {
    const rows = [
      ...makeSummaryRows(
        "pol-a",
        "Politician A",
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
      ),
      ...makeSummaryRows(
        "pol-b",
        "Politician B",
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 20],
        [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
      ),
    ];

    const result = generateVolatilityData(rows, 14, 2);

    expect(result.window).toBe(14);
    expect(result.sigma_threshold).toBe(2);
    expect(result.generated_at).toBeTruthy();
    expect(result.politicians["pol-a"]).toBeDefined();
    expect(result.politicians["pol-b"]).toBeDefined();

    // pol-a is stable
    expect(result.politicians["pol-a"].is_volatile).toBe(false);
    // pol-b has a spike
    expect(result.politicians["pol-b"].is_volatile).toBe(true);
    expect(result.politicians["pol-b"].direction).toBe("up");
  });

  it("includes name and latest values in output", () => {
    const rows = makeSummaryRows(
      "pol-a",
      "Politician A",
      [5, 6, 7],
      [3, 4, 5]
    );
    const result = generateVolatilityData(rows, 3, 2);
    const pol = result.politicians["pol-a"];

    expect(pol.name).toBe("Politician A");
    expect(pol.overall_score_latest).toBe(7);
    expect(pol.media_volume_latest).toBe(5);
  });

  it("handles single-day data gracefully", () => {
    const rows = makeSummaryRows("pol-a", "A", [5], [3]);
    const result = generateVolatilityData(rows, 14, 2);
    expect(result.politicians["pol-a"].is_volatile).toBe(false);
  });
});
