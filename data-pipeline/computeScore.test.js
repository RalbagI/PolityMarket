import { describe, it, expect } from "vitest";
import computeOverallScore, {
  applyEMA,
  computeOverallScore8dim,
  computePublicSentiment,
  computeParliamentaryActivity,
  computeMediaCredibility,
  computeTransparencyEthics,
  computeFieldActivity,
  computeSatireCulturalImpact,
  computeLegislativeQuality,
  computeFlipFlopIndex,
  computeAgendaBonus,
  applyWingRelativeNorm,
  WEIGHTS_8DIM,
} from "./lib/computeScore.js";

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

describe("WEIGHTS_8DIM", () => {
  it("weights sum to 1.0", () => {
    const total = Object.values(WEIGHTS_8DIM).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });

  it("has exactly 8 dimensions", () => {
    expect(Object.keys(WEIGHTS_8DIM)).toHaveLength(8);
  });
});

describe("computePublicSentiment", () => {
  it("returns 1 for perfect scores", () => {
    expect(computePublicSentiment(0, 1, 1)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for worst scores", () => {
    expect(computePublicSentiment(1, -1, 0)).toBeCloseTo(0.0, 5);
  });

  it("returns ~0.5 for neutral inputs", () => {
    const v = computePublicSentiment(0.5, 0, 0.5);
    expect(v).toBeGreaterThan(0.4);
    expect(v).toBeLessThan(0.6);
  });
});

describe("computeParliamentaryActivity", () => {
  it("returns null for null input", () => {
    expect(computeParliamentaryActivity(null)).toBeNull();
  });

  it("returns null when both attendance and committee are null", () => {
    expect(
      computeParliamentaryActivity({ attendance_rate: null, committee_rate: null })
    ).toBeNull();
  });

  it("returns 1 for perfect data", () => {
    const v = computeParliamentaryActivity({
      attendance_rate: 1,
      committee_rate: 1,
      initiative_score: 1,
    });
    expect(v).toBeCloseTo(1.0, 5);
  });

  it("clamps to [0, 1]", () => {
    const v = computeParliamentaryActivity({
      attendance_rate: 2,
      committee_rate: 2,
      initiative_score: 5,
    });
    expect(v).toBe(1);
  });
});

describe("computeMediaCredibility", () => {
  it("uses only LLM score when factCheck is null", () => {
    expect(computeMediaCredibility(0.8, null)).toBeCloseTo(0.8, 5);
  });

  it("blends LLM and fact-check 70/30", () => {
    const v = computeMediaCredibility(0.8, 0.4);
    expect(v).toBeCloseTo(0.7 * 0.8 + 0.3 * 0.4, 5);
  });
});

describe("computeTransparencyEthics", () => {
  it("applies no penalty for 0 lobbyist meetings", () => {
    expect(computeTransparencyEthics(0.8, 0)).toBeCloseTo(0.8, 5);
  });

  it("applies 0.05 per meeting, capped at 0.3", () => {
    expect(computeTransparencyEthics(0.8, 2)).toBeCloseTo(0.7, 5);
    expect(computeTransparencyEthics(0.8, 10)).toBeCloseTo(0.5, 5); // cap at 0.3
  });
});

describe("computeFieldActivity", () => {
  it("returns null for 0 activities (no evidence)", () => {
    expect(computeFieldActivity(0)).toBeNull();
  });

  it("returns 1 for ≥3 activities", () => {
    expect(computeFieldActivity(3)).toBe(1);
    expect(computeFieldActivity(5)).toBe(1);
  });

  it("returns proportional for 1-2 activities", () => {
    expect(computeFieldActivity(1)).toBeCloseTo(1 / 3, 5);
  });
});

describe("computeSatireCulturalImpact", () => {
  it("returns null for 0 mentions (no evidence)", () => {
    expect(computeSatireCulturalImpact(0, "neutral")).toBeNull();
  });

  it("tone_factor: mockery = 0.6, affectionate = 1.0, neutral = 0.85", () => {
    expect(computeSatireCulturalImpact(3, "mockery")).toBeCloseTo(0.6, 5);
    expect(computeSatireCulturalImpact(3, "affectionate")).toBeCloseTo(1.0, 5);
    expect(computeSatireCulturalImpact(3, "neutral")).toBeCloseTo(0.85, 5);
  });

  it("caps raw at 1.0 before applying tone factor", () => {
    expect(computeSatireCulturalImpact(10, "affectionate")).toBeCloseTo(1.0, 5);
    expect(computeSatireCulturalImpact(10, "mockery")).toBeCloseTo(0.6, 5);
  });
});

describe("computeLegislativeQuality", () => {
  it("returns null when both inputs are defaults (no real data)", () => {
    expect(computeLegislativeQuality(0.5, 0)).toBeNull();
    expect(computeLegislativeQuality(0.501, 0)).toBeNull(); // within 0.01 threshold
  });

  it("returns value when ratio differs from default", () => {
    const v = computeLegislativeQuality(0.7, 0);
    expect(v).toBeCloseTo(0.7 * 0.7, 5);
  });

  it("returns value when mmm > 0", () => {
    const v = computeLegislativeQuality(0.5, 1);
    expect(v).toBeCloseTo(0.7 * 0.5 + 0.3 * 0.5, 5);
  });

  it("blends ratio and mmm 70/30", () => {
    const v = computeLegislativeQuality(1.0, 2);
    expect(v).toBeCloseTo(0.7 * 1.0 + 0.3 * 1.0, 5);
  });
});

describe("computeFlipFlopIndex", () => {
  it("returns null when promisesChecked is 0", () => {
    expect(computeFlipFlopIndex(0, 0)).toBeNull();
  });

  it("returns 1 for no contradictions", () => {
    expect(computeFlipFlopIndex(0, 5)).toBe(1);
  });

  it("returns 0 when all promises contradicted", () => {
    expect(computeFlipFlopIndex(5, 5)).toBe(0);
  });

  it("caps at 0 when contradictions > checked", () => {
    expect(computeFlipFlopIndex(10, 5)).toBe(0);
  });
});

describe("computeAgendaBonus", () => {
  it("maps 1.0 → 0.5", () => {
    expect(computeAgendaBonus(1.0)).toBe(0.5);
  });

  it("maps -1.0 → -0.5", () => {
    expect(computeAgendaBonus(-1.0)).toBe(-0.5);
  });

  it("maps 0 → 0", () => {
    expect(computeAgendaBonus(0)).toBe(0);
  });

  it("clamps to [-0.5, 0.5]", () => {
    expect(computeAgendaBonus(99)).toBe(0.5);
    expect(computeAgendaBonus(-99)).toBe(-0.5);
  });
});

describe("computeOverallScore8dim", () => {
  const allDims = {
    dim_public_sentiment: 0.5,
    dim_parliamentary_activity: 0.5,
    dim_media_credibility: 0.5,
    dim_transparency_ethics: 0.5,
    dim_field_activity: 0.5,
    dim_satire_cultural_impact: 0.5,
    dim_legislative_quality: 0.5,
    dim_flipflop_index: 0.5,
  };

  it("returns ~5 for all 0.5 dimensions, no bonus", () => {
    const score = computeOverallScore8dim(allDims);
    expect(score).toBeCloseTo(5.0, 1);
  });

  it("returns 10 for all 1.0 dimensions with agenda +0.5", () => {
    const perfDims = { ...allDims };
    Object.keys(perfDims).forEach((k) => (perfDims[k] = 1.0));
    const score = computeOverallScore8dim(perfDims, "right", 0.5);
    expect(score).toBe(10);
  });

  it("handles null dimensions by redistributing weights", () => {
    const dimsWithNull = {
      ...allDims,
      dim_parliamentary_activity: null,
      dim_flipflop_index: null,
    };
    const score = computeOverallScore8dim(dimsWithNull);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(10);
    expect(Number.isFinite(score)).toBe(true);
  });

  it("returns a number in [0, 10] range for random inputs", () => {
    for (let i = 0; i < 20; i++) {
      const dims = {};
      for (const key of Object.keys(WEIGHTS_8DIM)) {
        dims[key] = Math.random() > 0.1 ? Math.random() : null;
      }
      const score = computeOverallScore8dim(dims, "left", Math.random() - 0.5);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it("applies agenda bonus correctly", () => {
    const base = computeOverallScore8dim(allDims, undefined, 0);
    const withBonus = computeOverallScore8dim(allDims, undefined, 0.5);
    expect(withBonus - base).toBeCloseTo(0.5, 1);
  });

  it("neutral politician with only 3 active dims scores ~5.0", () => {
    // Typical real-world case: field_activity, satire, legislative, parliamentary, flipflop all null
    const neutralDims = {
      dim_public_sentiment: 0.5,
      dim_parliamentary_activity: null,
      dim_media_credibility: 0.5,
      dim_transparency_ethics: 0.5,
      dim_field_activity: null,
      dim_satire_cultural_impact: null,
      dim_legislative_quality: null,
      dim_flipflop_index: null,
    };
    const score = computeOverallScore8dim(neutralDims);
    expect(score).toBeCloseTo(5.0, 1);
  });
});

describe("applyWingRelativeNorm", () => {
  it("re-centers coalition subset around 0.5", () => {
    const entries = [
      { wing: "right", dim_parliamentary_activity: 0.9 },
      { wing: "right", dim_parliamentary_activity: 0.1 },
      { wing: "left", dim_parliamentary_activity: 0.5 },
    ];
    applyWingRelativeNorm(entries, "dim_parliamentary_activity");
    const coalition = entries.filter((e) => e.wing === "right");
    const mean = coalition.reduce((s, e) => s + e.dim_parliamentary_activity, 0) / coalition.length;
    expect(mean).toBeCloseTo(0.5, 2);
  });

  it("does not modify a subset with only 1 member", () => {
    const entries = [
      { wing: "right", score: 0.9 },
      { wing: "left", score: 0.5 },
    ];
    const original = entries[0].score;
    applyWingRelativeNorm(entries, "score");
    expect(entries[0].score).toBe(original);
  });

  it("clamps normalized values to [0, 1]", () => {
    const entries = [
      { wing: "right", score: 0.0 },
      { wing: "right", score: 1.0 },
      { wing: "right", score: 0.5 },
    ];
    applyWingRelativeNorm(entries, "score");
    for (const e of entries) {
      expect(e.score).toBeGreaterThanOrEqual(0);
      expect(e.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("applyEMA", () => {
  it("blends 80% today + 20% yesterday by default", () => {
    expect(applyEMA(7.0, 5.0)).toBe(6.6);
  });

  it("returns raw score when no previous score (null)", () => {
    expect(applyEMA(7.0, null)).toBe(7.0);
  });

  it("returns raw score when previous is undefined", () => {
    expect(applyEMA(7.0, undefined)).toBe(7.0);
  });

  it("returns raw score when previous is NaN", () => {
    expect(applyEMA(7.0, NaN)).toBe(7.0);
  });

  it("clamps result to 0 minimum", () => {
    expect(applyEMA(0, 0)).toBe(0);
    expect(applyEMA(-1, 0)).toBe(0);
  });

  it("clamps result to 10 maximum", () => {
    expect(applyEMA(10, 10)).toBe(10);
    expect(applyEMA(11, 10)).toBe(10);
  });

  it("with alpha=1.0, returns raw score exactly", () => {
    expect(applyEMA(7.0, 5.0, 1.0)).toBe(7.0);
  });

  it("with alpha=0.0, returns yesterday exactly", () => {
    expect(applyEMA(7.0, 5.0, 0.0)).toBe(5.0);
  });

  it("returns 1 decimal place", () => {
    const result = applyEMA(7.123, 5.456);
    const decimals = result.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(1);
  });
});
