import { describe, it, expect } from "vitest";
import computeOverallScore from "./lib/computeScore.js";

describe("computeOverallScore", () => {
  it("returns 10 for perfect scores (hostility=0, policy=1, amp=1)", () => {
    expect(computeOverallScore(0, 1, 1)).toBe(10);
  });

  it("returns 0 for worst scores (hostility=1, policy=-1, amp=0)", () => {
    expect(computeOverallScore(1, -1, 0)).toBe(0);
  });

  it("returns ~5 for neutral scores (hostility=0.5, policy=0, amp=0.5)", () => {
    const score = computeOverallScore(0.5, 0, 0.5);
    expect(score).toBeGreaterThan(4);
    expect(score).toBeLessThan(6);
  });

  it("weights policy at 40%", () => {
    const low = computeOverallScore(0.5, -1, 0.5);
    const high = computeOverallScore(0.5, 1, 0.5);
    const diff = high - low;
    expect(diff).toBeCloseTo(4.0, 1); // 40% of 10-point scale
  });

  it("weights hostility at 35% (inverse)", () => {
    const calm = computeOverallScore(0, 0, 0.5);
    const hostile = computeOverallScore(1, 0, 0.5);
    const diff = calm - hostile;
    expect(diff).toBeCloseTo(3.5, 1); // 35% of 10-point scale
  });

  it("weights amplification at 25%", () => {
    const low = computeOverallScore(0.5, 0, 0);
    const high = computeOverallScore(0.5, 0, 1);
    const diff = high - low;
    expect(diff).toBeCloseTo(2.5, 1); // 25% of 10-point scale
  });

  it("returns value between 0 and 10", () => {
    for (let i = 0; i < 20; i++) {
      const h = Math.random();
      const p = Math.random() * 2 - 1;
      const m = Math.random();
      const score = computeOverallScore(h, p, m);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
});
