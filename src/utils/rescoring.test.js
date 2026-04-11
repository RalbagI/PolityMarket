import { describe, it, expect } from "vitest";
import {
  BALANCED_WEIGHTS,
  DIM_KEYS,
  normalizeWeights,
  rescoreEntries,
  rescoreEntry,
  weightsAreBalanced,
} from "./rescoring";

function fullDims(value = 0.6) {
  return Object.fromEntries(DIM_KEYS.map((k) => [k, value]));
}

describe("normalizeWeights", () => {
  it("sums to 1 when at least one weight is positive", () => {
    const w = normalizeWeights({ dim_public_sentiment: 2, dim_media_credibility: 2 });
    const sum = DIM_KEYS.reduce((s, k) => s + w[k], 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("falls back to balanced when every weight is zero or missing", () => {
    const w = normalizeWeights({});
    expect(w).toEqual(BALANCED_WEIGHTS);
  });

  it("clamps negative weights to zero", () => {
    const w = normalizeWeights({ dim_public_sentiment: -5, dim_media_credibility: 1 });
    expect(w.dim_public_sentiment).toBe(0);
    expect(w.dim_media_credibility).toBe(1);
  });

  it("ignores non-finite weights", () => {
    const w = normalizeWeights({ dim_public_sentiment: NaN, dim_media_credibility: 1 });
    expect(w.dim_media_credibility).toBe(1);
  });
});

describe("rescoreEntry", () => {
  it("returns a score in 0–10 under balanced weights", () => {
    const entry = fullDims(0.7);
    const score = rescoreEntry(entry, BALANCED_WEIGHTS);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
    expect(score).toBeCloseTo(7.0, 1);
  });

  it("redistributes missing dim weights proportionally", () => {
    // If only one dim has data, the score should equal that dim × 10.
    const entry = { ...fullDims(null), dim_public_sentiment: 0.4 };
    const score = rescoreEntry(entry, BALANCED_WEIGHTS);
    expect(score).toBeCloseTo(4.0, 1);
  });

  it("returns null when no dim data is present", () => {
    expect(rescoreEntry(fullDims(null), BALANCED_WEIGHTS)).toBeNull();
  });

  it("user weights change the result toward the up-weighted dim", () => {
    const entry = {
      ...fullDims(0),
      dim_public_sentiment: 1,
      dim_media_credibility: 0,
    };
    const sentimentHeavy = rescoreEntry(entry, {
      ...BALANCED_WEIGHTS,
      dim_public_sentiment: 10,
    });
    const credibilityHeavy = rescoreEntry(entry, {
      ...BALANCED_WEIGHTS,
      dim_media_credibility: 10,
      dim_public_sentiment: 0,
    });
    expect(sentimentHeavy).toBeGreaterThan(credibilityHeavy);
  });

  it("clamps output to [0, 10]", () => {
    const entry = fullDims(5); // out of the 0–1 contract
    const score = rescoreEntry(entry, BALANCED_WEIGHTS);
    expect(score).toBe(10);
  });

  it("returns null entry safely", () => {
    expect(rescoreEntry(null, BALANCED_WEIGHTS)).toBeNull();
  });
});

describe("rescoreEntries", () => {
  it("adds your_score to every entry that has dim data", () => {
    const scored = rescoreEntries(
      [fullDims(0.5), fullDims(0.9), fullDims(null)],
      BALANCED_WEIGHTS
    );
    expect(scored).toHaveLength(3);
    expect(scored[0].your_score).toBeGreaterThan(0);
    expect(scored[1].your_score).toBeGreaterThan(scored[0].your_score);
    expect(scored[2].your_score).toBeUndefined();
  });

  it("property: scores re-sort politicians based on weight changes", () => {
    const entries = [
      { ...fullDims(0), dim_public_sentiment: 1 },
      { ...fullDims(0), dim_media_credibility: 1 },
    ];
    const sentimentHeavy = rescoreEntries(entries, {
      ...BALANCED_WEIGHTS,
      dim_public_sentiment: 10,
    });
    const credibilityHeavy = rescoreEntries(entries, {
      ...BALANCED_WEIGHTS,
      dim_media_credibility: 10,
      dim_public_sentiment: 0,
    });
    expect(sentimentHeavy[0].your_score).toBeGreaterThan(sentimentHeavy[1].your_score);
    expect(credibilityHeavy[1].your_score).toBeGreaterThan(credibilityHeavy[0].your_score);
  });
});

describe("weightsAreBalanced", () => {
  it("returns true for the balanced preset", () => {
    expect(weightsAreBalanced(BALANCED_WEIGHTS)).toBe(true);
  });

  it("returns false once any weight is meaningfully different", () => {
    expect(weightsAreBalanced({ ...BALANCED_WEIGHTS, dim_public_sentiment: 0.5 })).toBe(false);
  });
});
