import { describe, it, expect } from "vitest";

// We need to extract the pure functions for testing. Since they're not
// exported from validateDrift.js, we re-implement them identically here
// and test the math. In a future refactor these should be extracted to
// a shared lib/stats.js module.

function klDivergence(p, q) {
  const epsilon = 1e-10;
  let divergence = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], epsilon);
    const qi = Math.max(q[i], epsilon);
    divergence += pi * Math.log(pi / qi);
  }
  return parseFloat(divergence.toFixed(6));
}

function populationStabilityIndex(p, q) {
  const epsilon = 1e-10;
  let psi = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], epsilon);
    const qi = Math.max(q[i], epsilon);
    psi += (qi - pi) * Math.log(qi / pi);
  }
  return parseFloat(psi.toFixed(6));
}

function binScores(scores, min, max, numBins) {
  const bins = new Array(numBins).fill(0);
  const binWidth = (max - min) / numBins;
  for (const score of scores) {
    let binIdx = Math.floor((score - min) / binWidth);
    if (binIdx >= numBins) binIdx = numBins - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx]++;
  }
  const total = scores.length || 1;
  return bins.map((b) => b / total);
}

function computeMSE(goldenEntries, llmResults) {
  let totalSE = 0;
  let count = 0;
  for (let i = 0; i < goldenEntries.length; i++) {
    const g = goldenEntries[i];
    const l = llmResults[i];
    if (!l) continue;
    const seHostility = (l.hostility_level - g.expected_hostility) ** 2;
    const sePolicy = (l.policy_approval - g.expected_policy_approval) ** 2;
    const seAmplification =
      (l.media_amplification - g.expected_media_amplification) ** 2;
    totalSE += (seHostility + sePolicy + seAmplification) / 3;
    count++;
  }
  return count > 0 ? parseFloat((totalSE / count).toFixed(6)) : null;
}

describe("klDivergence", () => {
  it("returns 0 for identical distributions", () => {
    const p = [0.25, 0.25, 0.25, 0.25];
    expect(klDivergence(p, p)).toBe(0);
  });

  it("returns positive value for different distributions", () => {
    const p = [0.5, 0.3, 0.1, 0.1];
    const q = [0.25, 0.25, 0.25, 0.25];
    expect(klDivergence(p, q)).toBeGreaterThan(0);
  });

  it("is asymmetric: D_KL(P||Q) != D_KL(Q||P)", () => {
    const p = [0.9, 0.1];
    const q = [0.5, 0.5];
    expect(klDivergence(p, q)).not.toBe(klDivergence(q, p));
  });
});

describe("populationStabilityIndex", () => {
  it("returns 0 for identical distributions", () => {
    const p = [0.25, 0.25, 0.25, 0.25];
    expect(populationStabilityIndex(p, p)).toBe(0);
  });

  it("returns < 0.1 for similar distributions (no shift)", () => {
    const p = [0.25, 0.25, 0.25, 0.25];
    const q = [0.24, 0.26, 0.24, 0.26];
    expect(populationStabilityIndex(p, q)).toBeLessThan(0.1);
  });

  it("returns >= 0.2 for very different distributions (significant drift)", () => {
    const p = [0.9, 0.05, 0.025, 0.025];
    const q = [0.025, 0.025, 0.05, 0.9];
    expect(populationStabilityIndex(p, q)).toBeGreaterThanOrEqual(0.2);
  });
});

describe("binScores", () => {
  it("bins all scores into correct buckets", () => {
    const scores = [0, 2.5, 5, 7.5, 10];
    const dist = binScores(scores, 0, 10, 4);
    // bins: [0,2.5) [2.5,5) [5,7.5) [7.5,10]
    // 0→bin0, 2.5→bin1, 5→bin2, 7.5→bin3, 10→bin3
    expect(dist).toEqual([0.2, 0.2, 0.2, 0.4]);
  });

  it("returns uniform distribution for single value", () => {
    const scores = [5];
    const dist = binScores(scores, 0, 10, 10);
    expect(dist[5]).toBe(1);
    expect(dist.reduce((a, b) => a + b)).toBeCloseTo(1);
  });

  it("handles empty array", () => {
    const dist = binScores([], 0, 10, 5);
    expect(dist).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("computeMSE", () => {
  it("returns 0 for perfect predictions", () => {
    const golden = [
      { expected_hostility: 0.5, expected_policy_approval: 0.0, expected_media_amplification: 0.5 },
    ];
    const results = [
      { hostility_level: 0.5, policy_approval: 0.0, media_amplification: 0.5 },
    ];
    expect(computeMSE(golden, results)).toBe(0);
  });

  it("returns correct MSE for known error", () => {
    const golden = [
      { expected_hostility: 0.0, expected_policy_approval: 0.0, expected_media_amplification: 0.0 },
    ];
    const results = [
      { hostility_level: 1.0, policy_approval: 1.0, media_amplification: 1.0 },
    ];
    // Each SE = 1.0, avg of 3 = 1.0, MSE over 1 entry = 1.0
    expect(computeMSE(golden, results)).toBe(1);
  });

  it("skips null results", () => {
    const golden = [
      { expected_hostility: 0.5, expected_policy_approval: 0.0, expected_media_amplification: 0.5 },
      { expected_hostility: 0.5, expected_policy_approval: 0.0, expected_media_amplification: 0.5 },
    ];
    const results = [null, { hostility_level: 0.5, policy_approval: 0.0, media_amplification: 0.5 }];
    expect(computeMSE(golden, results)).toBe(0);
  });

  it("returns null for all-null results", () => {
    const golden = [
      { expected_hostility: 0.5, expected_policy_approval: 0.0, expected_media_amplification: 0.5 },
    ];
    expect(computeMSE(golden, [null])).toBeNull();
  });
});
