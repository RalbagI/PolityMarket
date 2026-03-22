import { describe, it, expect } from "vitest";
import normalizeScores from "./normalizeScores";

describe("normalizeScores", () => {
  it("returns empty array for empty input", () => {
    expect(normalizeScores([])).toEqual([]);
  });

  it("normalizes scores to 0-1 range", () => {
    const input = [
      { name: "A", overall_score: 2, media_volume: 1 },
      { name: "B", overall_score: 8, media_volume: 5 },
    ];
    const result = normalizeScores(input);
    expect(result[0].normalizedScore).toBe(0); // min
    expect(result[1].normalizedScore).toBe(1); // max
  });

  it("normalizes volumes to 0-1 range", () => {
    const input = [
      { name: "A", overall_score: 5, media_volume: 2 },
      { name: "B", overall_score: 5, media_volume: 10 },
    ];
    const result = normalizeScores(input);
    expect(result[0].normalizedVolume).toBe(0);
    expect(result[1].normalizedVolume).toBe(1);
  });

  it("handles single politician (range = 0) without division by zero", () => {
    const input = [{ name: "A", overall_score: 5, media_volume: 3 }];
    const result = normalizeScores(input);
    expect(result[0].normalizedScore).toBe(0); // (5-5)/1 = 0
    expect(result[0].normalizedVolume).toBe(0);
    expect(Number.isFinite(result[0].treemapValue)).toBe(true);
  });

  it("preserves original properties", () => {
    const input = [{ name: "A", party: "X", overall_score: 5, media_volume: 3, extra: "kept" }];
    const result = normalizeScores(input);
    expect(result[0].name).toBe("A");
    expect(result[0].party).toBe("X");
    expect(result[0].extra).toBe("kept");
  });

  it("ensures treemapValue is at least 10% of volume range above min", () => {
    const input = [
      { name: "A", overall_score: 5, media_volume: 0 },
      { name: "B", overall_score: 5, media_volume: 10 },
    ];
    const result = normalizeScores(input);
    // treemapValue = max(0, 0 + 10 * 0.1) = 1
    expect(result[0].treemapValue).toBe(1);
    // treemapValue = max(10, 0 + 10 * 0.1) = 10
    expect(result[1].treemapValue).toBe(10);
  });

  it("handles identical scores (all politicians same score)", () => {
    const input = [
      { name: "A", overall_score: 5, media_volume: 3 },
      { name: "B", overall_score: 5, media_volume: 3 },
    ];
    const result = normalizeScores(input);
    // Range is 0, fallback divisor is 1
    expect(result[0].normalizedScore).toBe(0);
    expect(result[1].normalizedScore).toBe(0);
  });

  it("preserves wing and sector fields", () => {
    const input = [
      { name: "A", overall_score: 5, media_volume: 3, wing: "right", sector: "secular" },
      { name: "B", overall_score: 7, media_volume: 5, wing: "left", sector: "haredi" },
    ];
    const result = normalizeScores(input);
    expect(result[0].wing).toBe("right");
    expect(result[0].sector).toBe("secular");
    expect(result[1].wing).toBe("left");
    expect(result[1].sector).toBe("haredi");
  });
});
