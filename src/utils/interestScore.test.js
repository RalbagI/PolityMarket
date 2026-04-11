import { describe, it, expect } from "vitest";
import { computeInterestScores } from "./interestScore";

describe("computeInterestScores", () => {
  it("returns empty array for empty input", () => {
    expect(computeInterestScores([])).toEqual([]);
    expect(computeInterestScores(null)).toEqual([]);
  });

  it("adds interest_score and breakdown to every entry", () => {
    const entries = [
      { name: "A", market_delta_points: 1, overall_score_sigma: 0.5, media_volume: 10 },
      { name: "B", market_delta_points: -3, overall_score_sigma: 2, media_volume: 5 },
      { name: "C", market_delta_points: 0.2, overall_score_sigma: 0, media_volume: 20 },
    ];
    const scored = computeInterestScores(entries);
    expect(scored).toHaveLength(3);
    scored.forEach((e) => {
      expect(Number.isFinite(e.interest_score)).toBe(true);
      expect(e.interest_breakdown).toMatchObject({
        delta: expect.any(Number),
        sigma: expect.any(Number),
        volume: expect.any(Number),
      });
    });
  });

  it("larger absolute delta + sigma + volume produces higher interest", () => {
    const entries = [
      { market_delta_points: 0.1, overall_score_sigma: 0.1, media_volume: 1 },
      { market_delta_points: 10, overall_score_sigma: 3, media_volume: 100 },
    ];
    const [low, high] = computeInterestScores(entries);
    expect(high.interest_score).toBeGreaterThan(low.interest_score);
  });

  it("uses absolute value of delta (a crash and a rally count equally)", () => {
    const entries = [
      { market_delta_points: -5, overall_score_sigma: 0, media_volume: 10 },
      { market_delta_points: 5, overall_score_sigma: 0, media_volume: 10 },
    ];
    const [crash, rally] = computeInterestScores(entries);
    expect(crash.interest_score).toBeCloseTo(rally.interest_score);
  });

  it("treats non-finite inputs as 0", () => {
    const entries = [
      { market_delta_points: NaN, overall_score_sigma: undefined, media_volume: 10 },
      { market_delta_points: 2, overall_score_sigma: 1, media_volume: null },
      { market_delta_points: 2, overall_score_sigma: 1, media_volume: 20 },
    ];
    const scored = computeInterestScores(entries);
    scored.forEach((e) => expect(Number.isFinite(e.interest_score)).toBe(true));
  });

  it("returns zeros when all inputs are identical (zero variance)", () => {
    const entries = [
      { market_delta_points: 1, overall_score_sigma: 1, media_volume: 1 },
      { market_delta_points: 1, overall_score_sigma: 1, media_volume: 1 },
    ];
    const scored = computeInterestScores(entries);
    scored.forEach((e) => expect(e.interest_score).toBe(0));
  });
});
