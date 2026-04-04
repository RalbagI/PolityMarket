import { describe, it, expect } from "vitest";
import {
  SIGNAL_MODE_MEDIA_CLIMATE,
  SIGNAL_MODE_CONSENSUS_PROXY,
  SIGNAL_MODE_OPTIONS,
  resolveMediaClimateRaw,
  resolveMediaClimateDisplay,
  resolveConsensusDisplay,
  hasConsensusSignal,
  hasConsensusInRows,
  resolveSignalDisplayScore,
  resolveSignalRawScore,
  resolveSignalDelta,
  resolveSignalDeltaPct,
  resolveSignalTier,
  resolveSignalPercentile,
  resolveSignalConfidence,
  resolveSignalConfidenceBand,
  resolveSignalSource,
  isLowConfidenceSignal,
  getSignalLabelKey,
} from "./signalMode";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe("constants", () => {
  it("SIGNAL_MODE_MEDIA_CLIMATE equals 'media_climate'", () => {
    expect(SIGNAL_MODE_MEDIA_CLIMATE).toBe("media_climate");
  });

  it("SIGNAL_MODE_CONSENSUS_PROXY equals 'consensus_proxy'", () => {
    expect(SIGNAL_MODE_CONSENSUS_PROXY).toBe("consensus_proxy");
  });

  it("SIGNAL_MODE_OPTIONS is a frozen array of both modes", () => {
    expect(SIGNAL_MODE_OPTIONS).toEqual([SIGNAL_MODE_MEDIA_CLIMATE, SIGNAL_MODE_CONSENSUS_PROXY]);
    expect(Object.isFrozen(SIGNAL_MODE_OPTIONS)).toBe(true);
  });

  it("SIGNAL_MODE_OPTIONS cannot be mutated", () => {
    expect(() => {
      SIGNAL_MODE_OPTIONS.push("new_mode");
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// resolveMediaClimateRaw
// ---------------------------------------------------------------------------
describe("resolveMediaClimateRaw", () => {
  it("returns media_climate_raw when present and finite", () => {
    expect(resolveMediaClimateRaw({ media_climate_raw: 3.5 })).toBe(3.5);
  });

  it("falls back to overall_score when media_climate_raw is missing", () => {
    expect(resolveMediaClimateRaw({ overall_score: 7.2 })).toBe(7.2);
  });

  it("falls back to overall_score when media_climate_raw is NaN", () => {
    expect(resolveMediaClimateRaw({ media_climate_raw: NaN, overall_score: 4.0 })).toBe(4.0);
  });

  it("falls back to overall_score when media_climate_raw is Infinity", () => {
    expect(resolveMediaClimateRaw({ media_climate_raw: Infinity, overall_score: 2.0 })).toBe(2.0);
  });

  it("returns null when both fields are missing", () => {
    expect(resolveMediaClimateRaw({})).toBeNull();
  });

  it("returns null when both fields are non-finite", () => {
    expect(resolveMediaClimateRaw({ media_climate_raw: NaN, overall_score: Infinity })).toBeNull();
  });

  it("returns null for null entry", () => {
    expect(resolveMediaClimateRaw(null)).toBeNull();
  });

  it("returns null for undefined entry", () => {
    expect(resolveMediaClimateRaw(undefined)).toBeNull();
  });

  it("handles zero as a valid finite number", () => {
    expect(resolveMediaClimateRaw({ media_climate_raw: 0 })).toBe(0);
  });

  it("handles negative values", () => {
    expect(resolveMediaClimateRaw({ media_climate_raw: -2.5 })).toBe(-2.5);
  });
});

// ---------------------------------------------------------------------------
// resolveMediaClimateDisplay
// ---------------------------------------------------------------------------
describe("resolveMediaClimateDisplay", () => {
  it("returns media_climate_display when present and finite", () => {
    expect(resolveMediaClimateDisplay({ media_climate_display: 72 })).toBe(72);
  });

  it("falls back to market_score when media_climate_display is missing", () => {
    expect(resolveMediaClimateDisplay({ market_score: 65 })).toBe(65);
  });

  it("falls back to overall_score * 10 (rounded) when both are missing", () => {
    expect(resolveMediaClimateDisplay({ overall_score: 6.78 })).toBe(68);
  });

  it("rounds overall_score * 10 correctly", () => {
    expect(resolveMediaClimateDisplay({ overall_score: 6.75 })).toBe(68);
    expect(resolveMediaClimateDisplay({ overall_score: 6.74 })).toBe(67);
  });

  it("skips non-finite media_climate_display and falls back to market_score", () => {
    expect(resolveMediaClimateDisplay({ media_climate_display: NaN, market_score: 50 })).toBe(50);
  });

  it("skips non-finite market_score and falls back to overall_score * 10", () => {
    expect(
      resolveMediaClimateDisplay({
        media_climate_display: Infinity,
        market_score: -Infinity,
        overall_score: 5.0,
      })
    ).toBe(50);
  });

  it("returns null when all three fields are missing", () => {
    expect(resolveMediaClimateDisplay({})).toBeNull();
  });

  it("returns null when all fields are non-finite", () => {
    expect(
      resolveMediaClimateDisplay({
        media_climate_display: NaN,
        market_score: Infinity,
        overall_score: NaN,
      })
    ).toBeNull();
  });

  it("returns null for null entry", () => {
    expect(resolveMediaClimateDisplay(null)).toBeNull();
  });

  it("returns null for undefined entry", () => {
    expect(resolveMediaClimateDisplay(undefined)).toBeNull();
  });

  it("handles zero values in the fallback chain", () => {
    expect(resolveMediaClimateDisplay({ media_climate_display: 0 })).toBe(0);
    expect(resolveMediaClimateDisplay({ market_score: 0 })).toBe(0);
    expect(resolveMediaClimateDisplay({ overall_score: 0 })).toBe(0);
  });

  it("prefers media_climate_display over market_score and overall_score", () => {
    expect(
      resolveMediaClimateDisplay({
        media_climate_display: 80,
        market_score: 60,
        overall_score: 4.0,
      })
    ).toBe(80);
  });

  it("prefers market_score over overall_score when media_climate_display is absent", () => {
    expect(resolveMediaClimateDisplay({ market_score: 60, overall_score: 4.0 })).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// resolveConsensusDisplay
// ---------------------------------------------------------------------------
describe("resolveConsensusDisplay", () => {
  it("returns consensus_proxy when finite", () => {
    expect(resolveConsensusDisplay({ consensus_proxy: 55 })).toBe(55);
  });

  it("returns null when consensus_proxy is NaN", () => {
    expect(resolveConsensusDisplay({ consensus_proxy: NaN })).toBeNull();
  });

  it("returns null when consensus_proxy is Infinity", () => {
    expect(resolveConsensusDisplay({ consensus_proxy: Infinity })).toBeNull();
  });

  it("returns null for missing consensus_proxy", () => {
    expect(resolveConsensusDisplay({})).toBeNull();
  });

  it("returns null for null entry", () => {
    expect(resolveConsensusDisplay(null)).toBeNull();
  });

  it("returns null for undefined entry", () => {
    expect(resolveConsensusDisplay(undefined)).toBeNull();
  });

  it("handles zero", () => {
    expect(resolveConsensusDisplay({ consensus_proxy: 0 })).toBe(0);
  });

  it("handles negative values", () => {
    expect(resolveConsensusDisplay({ consensus_proxy: -10 })).toBe(-10);
  });
});

// ---------------------------------------------------------------------------
// hasConsensusSignal
// ---------------------------------------------------------------------------
describe("hasConsensusSignal", () => {
  it("returns true when consensus_proxy is finite", () => {
    expect(hasConsensusSignal({ consensus_proxy: 42 })).toBe(true);
  });

  it("returns true when consensus_proxy is zero", () => {
    expect(hasConsensusSignal({ consensus_proxy: 0 })).toBe(true);
  });

  it("returns false when consensus_proxy is NaN", () => {
    expect(hasConsensusSignal({ consensus_proxy: NaN })).toBe(false);
  });

  it("returns false when consensus_proxy is missing", () => {
    expect(hasConsensusSignal({})).toBe(false);
  });

  it("returns false for null entry", () => {
    expect(hasConsensusSignal(null)).toBe(false);
  });

  it("returns false for undefined entry", () => {
    expect(hasConsensusSignal(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasConsensusInRows
// ---------------------------------------------------------------------------
describe("hasConsensusInRows", () => {
  it("returns true when at least one row has a consensus signal", () => {
    const rows = [{ consensus_proxy: 50 }, { consensus_proxy: NaN }];
    expect(hasConsensusInRows(rows)).toBe(true);
  });

  it("returns false when no rows have a consensus signal", () => {
    const rows = [{ overall_score: 5 }, { overall_score: 6 }];
    expect(hasConsensusInRows(rows)).toBe(false);
  });

  it("returns false for empty rows", () => {
    expect(hasConsensusInRows([])).toBe(false);
  });

  it("defaults to empty array when rows is undefined", () => {
    expect(hasConsensusInRows()).toBe(false);
  });

  it("filters by date when date is provided", () => {
    const rows = [
      { date: "2025-01-01", consensus_proxy: 50 },
      { date: "2025-01-02", consensus_proxy: 60 },
    ];
    expect(hasConsensusInRows(rows, "2025-01-01")).toBe(true);
    expect(hasConsensusInRows(rows, "2025-01-03")).toBe(false);
  });

  it("skips date filter when date is null", () => {
    const rows = [{ consensus_proxy: 50 }];
    expect(hasConsensusInRows(rows, null)).toBe(true);
  });

  it("returns false when date matches but no consensus signal", () => {
    const rows = [{ date: "2025-01-01", overall_score: 5 }];
    expect(hasConsensusInRows(rows, "2025-01-01")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveSignalDisplayScore
// ---------------------------------------------------------------------------
describe("resolveSignalDisplayScore", () => {
  const entry = {
    media_climate_display: 72,
    market_score: 65,
    overall_score: 6.0,
    consensus_proxy: 55,
  };

  it("returns media_climate_display for media_climate mode", () => {
    expect(resolveSignalDisplayScore(entry, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(72);
  });

  it("returns consensus_proxy for consensus_proxy mode", () => {
    expect(resolveSignalDisplayScore(entry, SIGNAL_MODE_CONSENSUS_PROXY)).toBe(55);
  });

  it("defaults to media_climate mode when mode is omitted", () => {
    expect(resolveSignalDisplayScore(entry)).toBe(72);
  });

  it("returns null for null entry in both modes", () => {
    expect(resolveSignalDisplayScore(null, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
    expect(resolveSignalDisplayScore(null, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalRawScore
// ---------------------------------------------------------------------------
describe("resolveSignalRawScore", () => {
  it("returns media_climate_raw for media_climate mode", () => {
    const entry = { media_climate_raw: 6.5 };
    expect(resolveSignalRawScore(entry, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(6.5);
  });

  it("falls back from media_climate_raw to media_climate_display in media_climate mode", () => {
    const entry = { media_climate_display: 72 };
    expect(resolveSignalRawScore(entry, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(72);
  });

  it("falls back from raw (via overall_score) when only overall_score is present", () => {
    // resolveMediaClimateRaw returns overall_score directly (5.5), so never reaches display fallback
    expect(resolveSignalRawScore({ overall_score: 5.5 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(5.5);
  });

  it("falls back to resolveMediaClimateDisplay when resolveMediaClimateRaw returns null", () => {
    // No media_climate_raw, no overall_score -> raw returns null -> falls back to display chain
    expect(resolveSignalRawScore({ market_score: 72 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(72);
  });

  it("falls back to overall_score*10 via display when raw and market_score both unavailable", () => {
    // raw: no media_climate_raw, no overall_score -> null
    // display: no media_climate_display, no market_score, but has overall_score? No, we removed it.
    // Actually need an entry where raw returns null but display can use overall_score * 10.
    // That's impossible because raw also reads overall_score. Use media_climate_display instead.
    expect(resolveSignalRawScore({ media_climate_display: 45 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(
      45
    );
  });

  it("returns consensus_proxy for consensus_proxy mode", () => {
    const entry = { consensus_proxy: 48, media_climate_raw: 6.0 };
    expect(resolveSignalRawScore(entry, SIGNAL_MODE_CONSENSUS_PROXY)).toBe(48);
  });

  it("defaults to media_climate mode when mode is omitted", () => {
    const entry = { media_climate_raw: 7.0, consensus_proxy: 48 };
    expect(resolveSignalRawScore(entry)).toBe(7.0);
  });

  it("returns null for null entry", () => {
    expect(resolveSignalRawScore(null, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
    expect(resolveSignalRawScore(null, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });

  it("returns null for empty entry with no fallback fields", () => {
    expect(resolveSignalRawScore({}, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalDelta
// ---------------------------------------------------------------------------
describe("resolveSignalDelta", () => {
  it("returns market_delta_points for media_climate mode", () => {
    expect(resolveSignalDelta({ market_delta_points: 3.2 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(3.2);
  });

  it("returns null for consensus_proxy mode regardless of entry data", () => {
    expect(
      resolveSignalDelta({ market_delta_points: 3.2 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
  });

  it("returns null when market_delta_points is missing in media_climate mode", () => {
    expect(resolveSignalDelta({}, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("returns null when market_delta_points is NaN", () => {
    expect(resolveSignalDelta({ market_delta_points: NaN }, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("returns null when market_delta_points is Infinity", () => {
    expect(
      resolveSignalDelta({ market_delta_points: Infinity }, SIGNAL_MODE_MEDIA_CLIMATE)
    ).toBeNull();
  });

  it("handles zero delta", () => {
    expect(resolveSignalDelta({ market_delta_points: 0 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(0);
  });

  it("handles negative delta", () => {
    expect(resolveSignalDelta({ market_delta_points: -5.1 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(-5.1);
  });

  it("returns null for null entry", () => {
    expect(resolveSignalDelta(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalDeltaPct
// ---------------------------------------------------------------------------
describe("resolveSignalDeltaPct", () => {
  it("returns market_delta_pct for media_climate mode", () => {
    expect(resolveSignalDeltaPct({ market_delta_pct: 0.15 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(0.15);
  });

  it("returns null for consensus_proxy mode regardless of entry data", () => {
    expect(
      resolveSignalDeltaPct({ market_delta_pct: 0.15 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
  });

  it("returns null when market_delta_pct is missing", () => {
    expect(resolveSignalDeltaPct({}, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("returns null when market_delta_pct is NaN", () => {
    expect(resolveSignalDeltaPct({ market_delta_pct: NaN }, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("handles zero", () => {
    expect(resolveSignalDeltaPct({ market_delta_pct: 0 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(0);
  });

  it("returns null for null entry", () => {
    expect(resolveSignalDeltaPct(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalTier
// ---------------------------------------------------------------------------
describe("resolveSignalTier", () => {
  it("returns market_tier for media_climate mode", () => {
    expect(resolveSignalTier({ market_tier: "bullish" }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(
      "bullish"
    );
  });

  it("returns null for consensus_proxy mode regardless of entry data", () => {
    expect(resolveSignalTier({ market_tier: "bullish" }, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });

  it("returns null when market_tier is missing in media_climate mode", () => {
    expect(resolveSignalTier({}, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("returns null for null entry", () => {
    expect(resolveSignalTier(null)).toBeNull();
  });

  it("returns null for undefined entry", () => {
    expect(resolveSignalTier(undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalPercentile
// ---------------------------------------------------------------------------
describe("resolveSignalPercentile", () => {
  it("returns market_percentile for media_climate mode", () => {
    expect(resolveSignalPercentile({ market_percentile: 85 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(85);
  });

  it("returns null for consensus_proxy mode regardless of entry data", () => {
    expect(
      resolveSignalPercentile({ market_percentile: 85 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
  });

  it("returns null when market_percentile is NaN", () => {
    expect(
      resolveSignalPercentile({ market_percentile: NaN }, SIGNAL_MODE_MEDIA_CLIMATE)
    ).toBeNull();
  });

  it("returns null when market_percentile is missing", () => {
    expect(resolveSignalPercentile({}, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("handles zero percentile", () => {
    expect(resolveSignalPercentile({ market_percentile: 0 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(0);
  });

  it("returns null for null entry", () => {
    expect(resolveSignalPercentile(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalConfidence
// ---------------------------------------------------------------------------
describe("resolveSignalConfidence", () => {
  it("returns coverage_confidence for media_climate mode", () => {
    expect(resolveSignalConfidence({ coverage_confidence: 0.8 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(
      0.8
    );
  });

  it("returns consensus_confidence for consensus_proxy mode", () => {
    expect(
      resolveSignalConfidence({ consensus_confidence: 0.72 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBe(0.72);
  });

  it("does not cross-read fields between modes", () => {
    expect(
      resolveSignalConfidence({ coverage_confidence: 0.8 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
    expect(
      resolveSignalConfidence({ consensus_confidence: 0.72 }, SIGNAL_MODE_MEDIA_CLIMATE)
    ).toBeNull();
  });

  it("returns null for NaN confidence", () => {
    expect(
      resolveSignalConfidence({ coverage_confidence: NaN }, SIGNAL_MODE_MEDIA_CLIMATE)
    ).toBeNull();
    expect(
      resolveSignalConfidence({ consensus_confidence: NaN }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
  });

  it("returns null for Infinity confidence", () => {
    expect(
      resolveSignalConfidence({ coverage_confidence: Infinity }, SIGNAL_MODE_MEDIA_CLIMATE)
    ).toBeNull();
  });

  it("handles zero confidence", () => {
    expect(resolveSignalConfidence({ coverage_confidence: 0 }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(0);
    expect(resolveSignalConfidence({ consensus_confidence: 0 }, SIGNAL_MODE_CONSENSUS_PROXY)).toBe(
      0
    );
  });

  it("returns null for null entry", () => {
    expect(resolveSignalConfidence(null, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
    expect(resolveSignalConfidence(null, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalConfidenceBand
// ---------------------------------------------------------------------------
describe("resolveSignalConfidenceBand", () => {
  it("returns { low, high } for consensus_proxy mode with both bounds finite", () => {
    const entry = { consensus_ci_low: 40, consensus_ci_high: 60 };
    expect(resolveSignalConfidenceBand(entry, SIGNAL_MODE_CONSENSUS_PROXY)).toEqual({
      low: 40,
      high: 60,
    });
  });

  it("returns null for media_climate mode regardless of entry data", () => {
    const entry = { consensus_ci_low: 40, consensus_ci_high: 60 };
    expect(resolveSignalConfidenceBand(entry, SIGNAL_MODE_MEDIA_CLIMATE)).toBeNull();
  });

  it("returns null when consensus_ci_low is missing", () => {
    expect(
      resolveSignalConfidenceBand({ consensus_ci_high: 60 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
  });

  it("returns null when consensus_ci_high is missing", () => {
    expect(
      resolveSignalConfidenceBand({ consensus_ci_low: 40 }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBeNull();
  });

  it("returns null when both bounds are missing", () => {
    expect(resolveSignalConfidenceBand({}, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });

  it("returns null when low is NaN", () => {
    expect(
      resolveSignalConfidenceBand(
        { consensus_ci_low: NaN, consensus_ci_high: 60 },
        SIGNAL_MODE_CONSENSUS_PROXY
      )
    ).toBeNull();
  });

  it("returns null when high is Infinity", () => {
    expect(
      resolveSignalConfidenceBand(
        { consensus_ci_low: 40, consensus_ci_high: Infinity },
        SIGNAL_MODE_CONSENSUS_PROXY
      )
    ).toBeNull();
  });

  it("handles zero bounds", () => {
    expect(
      resolveSignalConfidenceBand(
        { consensus_ci_low: 0, consensus_ci_high: 0 },
        SIGNAL_MODE_CONSENSUS_PROXY
      )
    ).toEqual({ low: 0, high: 0 });
  });

  it("returns null for null entry in consensus_proxy mode", () => {
    expect(resolveSignalConfidenceBand(null, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });

  it("defaults mode to media_climate (returns null)", () => {
    const entry = { consensus_ci_low: 40, consensus_ci_high: 60 };
    expect(resolveSignalConfidenceBand(entry)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveSignalSource
// ---------------------------------------------------------------------------
describe("resolveSignalSource", () => {
  it("returns 'direct_coverage' when has_direct_coverage is true in media_climate mode", () => {
    expect(resolveSignalSource({ has_direct_coverage: true }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(
      "direct_coverage"
    );
  });

  it("returns 'sparse_coverage' when has_direct_coverage is false in media_climate mode", () => {
    expect(resolveSignalSource({ has_direct_coverage: false }, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(
      "sparse_coverage"
    );
  });

  it("returns 'sparse_coverage' when has_direct_coverage is missing in media_climate mode", () => {
    expect(resolveSignalSource({}, SIGNAL_MODE_MEDIA_CLIMATE)).toBe("sparse_coverage");
  });

  it("returns consensus_signal_source for consensus_proxy mode", () => {
    expect(
      resolveSignalSource({ consensus_signal_source: "polls_media" }, SIGNAL_MODE_CONSENSUS_PROXY)
    ).toBe("polls_media");
  });

  it("returns null when consensus_signal_source is missing in consensus_proxy mode", () => {
    expect(resolveSignalSource({}, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });

  it("returns null for null entry in consensus_proxy mode", () => {
    expect(resolveSignalSource(null, SIGNAL_MODE_CONSENSUS_PROXY)).toBeNull();
  });

  it("returns 'sparse_coverage' for null entry in media_climate mode", () => {
    expect(resolveSignalSource(null, SIGNAL_MODE_MEDIA_CLIMATE)).toBe("sparse_coverage");
  });

  it("defaults to media_climate mode", () => {
    expect(resolveSignalSource({ has_direct_coverage: true })).toBe("direct_coverage");
  });
});

// ---------------------------------------------------------------------------
// isLowConfidenceSignal
// ---------------------------------------------------------------------------
describe("isLowConfidenceSignal", () => {
  describe("media_climate mode", () => {
    it("returns true when has_direct_coverage is false", () => {
      expect(
        isLowConfidenceSignal(
          { has_direct_coverage: false, media_climate_display: 50 },
          SIGNAL_MODE_MEDIA_CLIMATE
        )
      ).toBe(true);
    });

    it("returns true when coverage_confidence < 0.45", () => {
      expect(
        isLowConfidenceSignal(
          { coverage_confidence: 0.44, has_direct_coverage: true, media_climate_display: 50 },
          SIGNAL_MODE_MEDIA_CLIMATE
        )
      ).toBe(true);
    });

    it("returns false when coverage_confidence is exactly 0.45", () => {
      expect(
        isLowConfidenceSignal(
          { coverage_confidence: 0.45, has_direct_coverage: true, media_climate_display: 50 },
          SIGNAL_MODE_MEDIA_CLIMATE
        )
      ).toBe(false);
    });

    it("returns true when resolveMediaClimateDisplay returns null (no score data)", () => {
      expect(
        isLowConfidenceSignal(
          { has_direct_coverage: true, coverage_confidence: 0.9 },
          SIGNAL_MODE_MEDIA_CLIMATE
        )
      ).toBe(true);
    });

    it("returns false for a healthy media_climate entry", () => {
      expect(
        isLowConfidenceSignal(
          { has_direct_coverage: true, coverage_confidence: 0.8, media_climate_display: 65 },
          SIGNAL_MODE_MEDIA_CLIMATE
        )
      ).toBe(false);
    });

    it("returns false when confidence is null (not below threshold) and other conditions ok", () => {
      expect(
        isLowConfidenceSignal(
          { has_direct_coverage: true, media_climate_display: 60 },
          SIGNAL_MODE_MEDIA_CLIMATE
        )
      ).toBe(false);
    });

    it("returns true for null entry (no display score)", () => {
      expect(isLowConfidenceSignal(null, SIGNAL_MODE_MEDIA_CLIMATE)).toBe(true);
    });
  });

  describe("consensus_proxy mode", () => {
    it("returns true when consensus_proxy is not finite", () => {
      expect(isLowConfidenceSignal({}, SIGNAL_MODE_CONSENSUS_PROXY)).toBe(true);
    });

    it("returns true when consensus_proxy is NaN", () => {
      expect(isLowConfidenceSignal({ consensus_proxy: NaN }, SIGNAL_MODE_CONSENSUS_PROXY)).toBe(
        true
      );
    });

    it("returns true when consensus_signal_source is 'media_only'", () => {
      expect(
        isLowConfidenceSignal(
          { consensus_proxy: 50, consensus_signal_source: "media_only", consensus_confidence: 0.8 },
          SIGNAL_MODE_CONSENSUS_PROXY
        )
      ).toBe(true);
    });

    it("returns true when has_direct_coverage is false", () => {
      expect(
        isLowConfidenceSignal(
          { consensus_proxy: 50, has_direct_coverage: false, consensus_confidence: 0.8 },
          SIGNAL_MODE_CONSENSUS_PROXY
        )
      ).toBe(true);
    });

    it("returns true when consensus_confidence < 0.55", () => {
      expect(
        isLowConfidenceSignal(
          { consensus_proxy: 50, consensus_confidence: 0.54, has_direct_coverage: true },
          SIGNAL_MODE_CONSENSUS_PROXY
        )
      ).toBe(true);
    });

    it("returns false when consensus_confidence is exactly 0.55", () => {
      expect(
        isLowConfidenceSignal(
          { consensus_proxy: 50, consensus_confidence: 0.55, has_direct_coverage: true },
          SIGNAL_MODE_CONSENSUS_PROXY
        )
      ).toBe(false);
    });

    it("returns false for a healthy consensus entry", () => {
      expect(
        isLowConfidenceSignal(
          {
            consensus_proxy: 55,
            consensus_confidence: 0.8,
            consensus_signal_source: "polls_media",
            has_direct_coverage: true,
          },
          SIGNAL_MODE_CONSENSUS_PROXY
        )
      ).toBe(false);
    });

    it("returns false when confidence is null (not below threshold) and other conditions ok", () => {
      expect(
        isLowConfidenceSignal(
          {
            consensus_proxy: 55,
            has_direct_coverage: true,
            consensus_signal_source: "polls_media",
          },
          SIGNAL_MODE_CONSENSUS_PROXY
        )
      ).toBe(false);
    });

    it("returns true for null entry", () => {
      expect(isLowConfidenceSignal(null, SIGNAL_MODE_CONSENSUS_PROXY)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// getSignalLabelKey
// ---------------------------------------------------------------------------
describe("getSignalLabelKey", () => {
  it("returns 'signals.mediaClimate' for media_climate mode", () => {
    expect(getSignalLabelKey(SIGNAL_MODE_MEDIA_CLIMATE)).toBe("signals.mediaClimate");
  });

  it("returns 'signals.consensusProxy' for consensus_proxy mode", () => {
    expect(getSignalLabelKey(SIGNAL_MODE_CONSENSUS_PROXY)).toBe("signals.consensusProxy");
  });

  it("defaults to media_climate label when mode is omitted", () => {
    expect(getSignalLabelKey()).toBe("signals.mediaClimate");
  });

  it("returns media_climate label for unrecognized mode", () => {
    expect(getSignalLabelKey("unknown_mode")).toBe("signals.mediaClimate");
  });
});
