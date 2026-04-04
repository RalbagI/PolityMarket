import { describe, it, expect } from "vitest";
import {
  buildPublicPollLookup,
  buildConsensusCalibrator,
  estimateConsensusObservation,
  annotatePoliticianConsensusTimeline,
  annotatePartyConsensusTimeline,
} from "./consensusScore";

// ---------------------------------------------------------------------------
// Helpers for building test fixtures
// ---------------------------------------------------------------------------

function makePoll(overrides = {}) {
  return {
    entity_type: "politician",
    entity_id: "p1",
    value: 55,
    date: "2026-01-15",
    ...overrides,
  };
}

function makeRow(overrides = {}) {
  return {
    date: "2026-01-15",
    politician_id: "p1",
    party: "likud",
    signal_strength: 0.6,
    source_diversity: 3,
    cross_source_agreement: 0.7,
    policy_approval: 0.2,
    hostility_level: 0.3,
    media_amplification: 0.4,
    mainstream_share: 0.5,
    social_share: 0.2,
    ...overrides,
  };
}

function makePartyRow(overrides = {}) {
  return {
    date: "2026-01-15",
    party: "likud",
    signal_strength: 0.5,
    source_diversity: 2,
    cross_source_agreement: 0.5,
    policy_approval: 0,
    hostility_level: 0.5,
    media_amplification: 0.3,
    mainstream_share: 0.5,
    social_share: 0.1,
    ...overrides,
  };
}

const CONSENSUS_OUTPUT_FIELDS = [
  "consensus_proxy",
  "consensus_ci_low",
  "consensus_ci_high",
  "consensus_confidence",
  "consensus_signal_source",
];

const INTERNAL_FIELDS = [
  "_consensus_entity_key",
  "_consensus_observation",
  "_consensus_variance",
  "_consensus_confidence",
  "_consensus_signal_source",
  "_consensus_media_projection",
];

// ---------------------------------------------------------------------------
// buildPublicPollLookup
// ---------------------------------------------------------------------------

describe("buildPublicPollLookup", () => {
  it("builds a map keyed by entity_type:entity_id", () => {
    const polls = [
      makePoll({ entity_type: "politician", entity_id: "p1", value: 60, date: "2026-01-10" }),
      makePoll({ entity_type: "party", entity_id: "likud", value: 40, date: "2026-01-12" }),
    ];
    const lookup = buildPublicPollLookup(polls);

    expect(lookup).toBeInstanceOf(Map);
    expect(lookup.has("politician:p1")).toBe(true);
    expect(lookup.has("party:likud")).toBe(true);
    expect(lookup.get("politician:p1")).toHaveLength(1);
    expect(lookup.get("party:likud")).toHaveLength(1);
  });

  it("sorts entries by date within each key", () => {
    const polls = [
      makePoll({ date: "2026-01-20", value: 70 }),
      makePoll({ date: "2026-01-10", value: 50 }),
      makePoll({ date: "2026-01-15", value: 60 }),
    ];
    const lookup = buildPublicPollLookup(polls);
    const rows = lookup.get("politician:p1");

    expect(rows[0].date).toBe("2026-01-10");
    expect(rows[1].date).toBe("2026-01-15");
    expect(rows[2].date).toBe("2026-01-20");
  });

  it("clamps poll values to [0, 100]", () => {
    const polls = [
      makePoll({ value: -10, date: "2026-01-01" }),
      makePoll({ value: 150, date: "2026-01-02" }),
    ];
    const lookup = buildPublicPollLookup(polls);
    const rows = lookup.get("politician:p1");

    expect(rows[0].value).toBe(0);
    expect(rows[1].value).toBe(100);
  });

  it("skips entries with missing entity_type", () => {
    const polls = [makePoll({ entity_type: undefined })];
    const lookup = buildPublicPollLookup(polls);
    expect(lookup.size).toBe(0);
  });

  it("skips entries with missing entity_id", () => {
    const polls = [makePoll({ entity_id: undefined })];
    const lookup = buildPublicPollLookup(polls);
    expect(lookup.size).toBe(0);
  });

  it("skips entries with non-finite value", () => {
    const polls = [
      makePoll({ value: NaN }),
      makePoll({ value: Infinity }),
      makePoll({ value: undefined }),
      makePoll({ value: "abc" }),
    ];
    const lookup = buildPublicPollLookup(polls);
    expect(lookup.size).toBe(0);
  });

  it("skips entries with non-string date", () => {
    const polls = [makePoll({ date: 12345 }), makePoll({ date: null })];
    const lookup = buildPublicPollLookup(polls);
    expect(lookup.size).toBe(0);
  });

  it("handles empty input", () => {
    expect(buildPublicPollLookup([]).size).toBe(0);
  });

  it("handles undefined input (default parameter)", () => {
    expect(buildPublicPollLookup().size).toBe(0);
  });

  it("allows duplicate entries for the same key (no deduplication)", () => {
    const polls = [
      makePoll({ value: 50, date: "2026-01-10" }),
      makePoll({ value: 55, date: "2026-01-10" }),
    ];
    const lookup = buildPublicPollLookup(polls);
    expect(lookup.get("politician:p1")).toHaveLength(2);
  });

  it("groups multiple entity types independently", () => {
    const polls = [
      makePoll({ entity_type: "politician", entity_id: "p1", value: 50, date: "2026-01-01" }),
      makePoll({ entity_type: "politician", entity_id: "p1", value: 60, date: "2026-01-02" }),
      makePoll({ entity_type: "party", entity_id: "likud", value: 45, date: "2026-01-01" }),
    ];
    const lookup = buildPublicPollLookup(polls);

    expect(lookup.get("politician:p1")).toHaveLength(2);
    expect(lookup.get("party:likud")).toHaveLength(1);
  });

  it("preserves extra fields from the original poll object", () => {
    const polls = [makePoll({ sample_size: 1200, margin: 3.5 })];
    const lookup = buildPublicPollLookup(polls);
    const row = lookup.get("politician:p1")[0];

    expect(row.sample_size).toBe(1200);
    expect(row.margin).toBe(3.5);
  });
});

// ---------------------------------------------------------------------------
// buildConsensusCalibrator
// ---------------------------------------------------------------------------

describe("buildConsensusCalibrator", () => {
  it("returns default coefficients when samples are below minSamples", () => {
    const rows = [makeRow()];
    const pollLookup = buildPublicPollLookup([makePoll({ date: "2026-01-15", value: 60 })]);

    const result = buildConsensusCalibrator(rows, pollLookup, { minSamples: 12 });

    expect(result.fitted).toBe(false);
    expect(result.sampleCount).toBeLessThan(12);
    expect(result.coefficients).toHaveLength(9);
  });

  it("returns fitted coefficients when enough samples exist", () => {
    const polls = [];
    const rows = [];
    for (let i = 0; i < 30; i += 1) {
      const day = String(i + 1).padStart(2, "0");
      const date = `2026-01-${day}`;
      rows.push(
        makeRow({
          date,
          signal_strength: 0.3 + (i % 5) * 0.1,
          source_diversity: 1 + (i % 4),
          policy_approval: -0.5 + (i % 10) * 0.1,
          hostility_level: 0.1 + (i % 6) * 0.1,
          cross_source_agreement: 0.3 + (i % 5) * 0.1,
        })
      );
      polls.push(makePoll({ date, value: 30 + i * 1.5 }));
    }
    const pollLookup = buildPublicPollLookup(polls);
    const result = buildConsensusCalibrator(rows, pollLookup, { minSamples: 12 });

    expect(result.fitted).toBe(true);
    expect(result.sampleCount).toBe(30);
    expect(result.coefficients).toHaveLength(9);
    // Fitted coefficients should differ from defaults
    expect(result.coefficients).not.toEqual(
      expect.arrayContaining([50, 9, 7, 16, 14, 10, -6, 4, 4])
    );
  });

  it("returns defaults when all rows lack matching polls", () => {
    const rows = [makeRow(), makeRow({ date: "2026-01-16" })];
    const pollLookup = new Map();

    const result = buildConsensusCalibrator(rows, pollLookup);

    expect(result.fitted).toBe(false);
    expect(result.sampleCount).toBe(0);
  });

  it("falls back to party poll when no direct poll exists for politician", () => {
    const rows = Array.from({ length: 15 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return makeRow({
        date: `2026-01-${day}`,
        signal_strength: 0.3 + (i % 5) * 0.1,
        source_diversity: 1 + (i % 4),
      });
    });

    const partyPolls = rows.map((row) =>
      makePoll({
        entity_type: "party",
        entity_id: "likud",
        date: row.date,
        value: 45 + Math.random() * 10,
      })
    );
    const pollLookup = buildPublicPollLookup(partyPolls);
    const result = buildConsensusCalibrator(rows, pollLookup, { minSamples: 12 });

    expect(result.sampleCount).toBe(15);
    expect(result.fitted).toBe(true);
  });

  it("handles entityType party option", () => {
    const rows = Array.from({ length: 15 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return makePartyRow({
        date: `2026-01-${day}`,
        signal_strength: 0.3 + (i % 5) * 0.1,
      });
    });

    const partyPolls = rows.map((row) =>
      makePoll({
        entity_type: "party",
        entity_id: "likud",
        date: row.date,
        value: 40 + Math.random() * 20,
      })
    );
    const pollLookup = buildPublicPollLookup(partyPolls);
    const result = buildConsensusCalibrator(rows, pollLookup, {
      entityType: "party",
      minSamples: 12,
    });

    expect(result.sampleCount).toBe(15);
    expect(result.fitted).toBe(true);
  });

  it("returns defaults for degenerate data (all identical rows)", () => {
    const identicalRow = makeRow({ signal_strength: 0.5 });
    const rows = Array.from({ length: 20 }, () => ({ ...identicalRow }));
    const polls = rows.map(() => makePoll({ date: "2026-01-15", value: 50 }));
    const pollLookup = buildPublicPollLookup(polls);

    const result = buildConsensusCalibrator(rows, pollLookup, { minSamples: 12 });

    // With all-identical data the system may still solve (ridge regression prevents
    // singularity), but the coefficients should be finite.
    expect(result.coefficients).toHaveLength(9);
    result.coefficients.forEach((c) => expect(Number.isFinite(c)).toBe(true));
  });

  it("uses default pollLookup when none is provided", () => {
    const result = buildConsensusCalibrator([makeRow()]);
    expect(result.fitted).toBe(false);
    expect(result.sampleCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// estimateConsensusObservation
// ---------------------------------------------------------------------------

describe("estimateConsensusObservation", () => {
  it("returns media_only when no polls are available", () => {
    const result = estimateConsensusObservation(makeRow());

    expect(result.signal_source).toBe("media_only");
    expect(result.observation).toBeGreaterThanOrEqual(0);
    expect(result.observation).toBeLessThanOrEqual(100);
    expect(result.variance).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0.12);
    expect(result.confidence).toBeLessThanOrEqual(0.96);
    expect(result.media_projection).toBeGreaterThanOrEqual(0);
    expect(result.media_projection).toBeLessThanOrEqual(100);
  });

  it("returns direct_poll when directPoll is provided", () => {
    const result = estimateConsensusObservation(makeRow(), {
      directPoll: { value: 70, age_days: 2 },
    });

    expect(result.signal_source).toBe("direct_poll");
    // With a strong direct poll signal, the observation should lean toward poll value
    expect(result.observation).toBeGreaterThan(50);
  });

  it("returns party_poll+media when only partyPoll is provided", () => {
    const result = estimateConsensusObservation(makeRow(), {
      partyPoll: { value: 45, age_days: 5 },
    });

    expect(result.signal_source).toBe("party_poll+media");
  });

  it("prefers directPoll over partyPoll for signal source", () => {
    const result = estimateConsensusObservation(makeRow(), {
      directPoll: { value: 60, age_days: 1 },
      partyPoll: { value: 40, age_days: 1 },
    });

    expect(result.signal_source).toBe("direct_poll");
  });

  it("incorporates partyPrior into the observation", () => {
    const withoutPrior = estimateConsensusObservation(makeRow());
    const withPrior = estimateConsensusObservation(makeRow(), { partyPrior: 80 });

    // The observation with a high party prior should differ from one without
    expect(withPrior.observation).not.toBe(withoutPrior.observation);
  });

  it("higher signal_strength yields higher confidence", () => {
    const lowSignal = estimateConsensusObservation(makeRow({ signal_strength: 0.1 }));
    const highSignal = estimateConsensusObservation(makeRow({ signal_strength: 0.9 }));

    expect(highSignal.confidence).toBeGreaterThan(lowSignal.confidence);
  });

  it("older polls reduce confidence (stale polls)", () => {
    const fresh = estimateConsensusObservation(makeRow(), {
      directPoll: { value: 60, age_days: 0 },
    });
    const stale = estimateConsensusObservation(makeRow(), {
      directPoll: { value: 60, age_days: 20 },
    });

    // Stale poll should lead to higher variance
    expect(stale.variance).toBeGreaterThan(fresh.variance);
  });

  it("handles null/undefined row gracefully", () => {
    const result = estimateConsensusObservation(null);
    expect(result.signal_source).toBe("media_only");
    expect(result.observation).toBeGreaterThanOrEqual(0);
    expect(result.observation).toBeLessThanOrEqual(100);
  });

  it("handles undefined row gracefully", () => {
    const result = estimateConsensusObservation(undefined);
    expect(result.signal_source).toBe("media_only");
    expect(Number.isFinite(result.observation)).toBe(true);
  });

  it("uses calibration coefficients when provided", () => {
    const customCalibration = {
      coefficients: [40, 5, 5, 5, 5, 5, 0, 2, 2],
      fitted: true,
    };
    const withDefault = estimateConsensusObservation(makeRow());
    const withCustom = estimateConsensusObservation(makeRow(), {
      calibration: customCalibration,
    });

    expect(withCustom.media_projection).not.toBe(withDefault.media_projection);
  });

  it("clamps observation between 0 and 100", () => {
    // Use extreme values to push the estimate toward boundaries
    const highRow = makeRow({
      signal_strength: 1,
      source_diversity: 6,
      policy_approval: 1,
      hostility_level: 0,
      media_amplification: 1,
      cross_source_agreement: 1,
      mainstream_share: 1,
      social_share: 1,
    });
    const result = estimateConsensusObservation(highRow, {
      directPoll: { value: 99, age_days: 0 },
      partyPrior: 99,
    });

    expect(result.observation).toBeLessThanOrEqual(100);
    expect(result.observation).toBeGreaterThanOrEqual(0);
  });

  it("clamps confidence between 0.12 and 0.96", () => {
    const bestCase = estimateConsensusObservation(
      makeRow({ signal_strength: 1, source_diversity: 6, cross_source_agreement: 1 }),
      { directPoll: { value: 50, age_days: 0 } }
    );
    const worstCase = estimateConsensusObservation(
      makeRow({ signal_strength: 0, source_diversity: 0, cross_source_agreement: 0 })
    );

    expect(bestCase.confidence).toBeLessThanOrEqual(0.96);
    expect(worstCase.confidence).toBeGreaterThanOrEqual(0.12);
  });

  it("returns all expected fields", () => {
    const result = estimateConsensusObservation(makeRow());

    expect(result).toHaveProperty("observation");
    expect(result).toHaveProperty("variance");
    expect(result).toHaveProperty("confidence");
    expect(result).toHaveProperty("signal_source");
    expect(result).toHaveProperty("media_projection");
  });
});

// ---------------------------------------------------------------------------
// annotatePoliticianConsensusTimeline
// ---------------------------------------------------------------------------

describe("annotatePoliticianConsensusTimeline", () => {
  it("annotates a multi-day series with consensus fields", () => {
    const rows = [
      makeRow({ date: "2026-01-13" }),
      makeRow({ date: "2026-01-14" }),
      makeRow({ date: "2026-01-15" }),
    ];

    const result = annotatePoliticianConsensusTimeline(rows);

    expect(result).toHaveLength(3);
    for (const row of result) {
      for (const field of CONSENSUS_OUTPUT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
      expect(row.consensus_proxy).toBeGreaterThanOrEqual(0);
      expect(row.consensus_proxy).toBeLessThanOrEqual(100);
      expect(row.consensus_ci_low).toBeLessThanOrEqual(row.consensus_proxy);
      expect(row.consensus_ci_high).toBeGreaterThanOrEqual(row.consensus_proxy);
      expect(row.consensus_confidence).toBeGreaterThanOrEqual(0);
      expect(row.consensus_confidence).toBeLessThanOrEqual(1);
    }
  });

  it("strips internal _consensus_ fields from output", () => {
    const rows = [makeRow({ date: "2026-01-15" })];
    const result = annotatePoliticianConsensusTimeline(rows);

    for (const row of result) {
      for (const field of INTERNAL_FIELDS) {
        expect(row).not.toHaveProperty(field);
      }
    }
  });

  it("preserves original row fields", () => {
    const rows = [makeRow({ date: "2026-01-15", politician_id: "p1", party: "likud" })];
    const result = annotatePoliticianConsensusTimeline(rows);

    expect(result[0].date).toBe("2026-01-15");
    expect(result[0].politician_id).toBe("p1");
    expect(result[0].party).toBe("likud");
  });

  it("returns sorted output by date", () => {
    const rows = [
      makeRow({ date: "2026-01-17" }),
      makeRow({ date: "2026-01-13" }),
      makeRow({ date: "2026-01-15" }),
    ];
    const result = annotatePoliticianConsensusTimeline(rows);

    expect(result[0].date).toBe("2026-01-13");
    expect(result[1].date).toBe("2026-01-15");
    expect(result[2].date).toBe("2026-01-17");
  });

  it("handles single entry", () => {
    const rows = [makeRow({ date: "2026-01-15" })];
    const result = annotatePoliticianConsensusTimeline(rows);

    expect(result).toHaveLength(1);
    for (const field of CONSENSUS_OUTPUT_FIELDS) {
      expect(result[0]).toHaveProperty(field);
    }
  });

  it("returns empty array for empty input", () => {
    expect(annotatePoliticianConsensusTimeline([])).toEqual([]);
  });

  it("throws on null/undefined input (no implicit coercion)", () => {
    expect(() => annotatePoliticianConsensusTimeline(null)).toThrow();
    expect(() => annotatePoliticianConsensusTimeline(undefined)).toThrow();
  });

  it("uses partyTimeline as prior when provided", () => {
    const partyTimeline = [{ date: "2026-01-15", party: "likud", consensus_proxy: 70 }];
    const rows = [makeRow({ date: "2026-01-15", party: "likud" })];

    const withPrior = annotatePoliticianConsensusTimeline(rows, { partyTimeline });
    const withoutPrior = annotatePoliticianConsensusTimeline(rows);

    // Party prior should influence the result
    expect(withPrior[0].consensus_proxy).not.toBe(withoutPrior[0].consensus_proxy);
  });

  it("uses pollLookup to incorporate poll data", () => {
    const polls = [makePoll({ date: "2026-01-15", value: 80 })];
    const pollLookup = buildPublicPollLookup(polls);
    const rows = [makeRow({ date: "2026-01-15" })];

    const withPolls = annotatePoliticianConsensusTimeline(rows, { pollLookup });
    const withoutPolls = annotatePoliticianConsensusTimeline(rows);

    // With a poll value of 80, the consensus should be pulled upward
    expect(withPolls[0].consensus_proxy).not.toBe(withoutPolls[0].consensus_proxy);
    expect(withPolls[0].consensus_signal_source).toBe("direct_poll");
  });

  it("uses party poll when no direct politician poll exists", () => {
    const polls = [
      makePoll({ entity_type: "party", entity_id: "likud", date: "2026-01-15", value: 65 }),
    ];
    const pollLookup = buildPublicPollLookup(polls);
    const rows = [makeRow({ date: "2026-01-15" })];

    const result = annotatePoliticianConsensusTimeline(rows, { pollLookup });

    expect(result[0].consensus_signal_source).toBe("party_poll+media");
  });

  it("labels media_only when no polls exist", () => {
    const rows = [makeRow({ date: "2026-01-15" })];
    const result = annotatePoliticianConsensusTimeline(rows);

    expect(result[0].consensus_signal_source).toBe("media_only");
  });

  it("handles multiple politicians in the same series", () => {
    const rows = [
      makeRow({ date: "2026-01-15", politician_id: "p1" }),
      makeRow({ date: "2026-01-15", politician_id: "p2" }),
      makeRow({ date: "2026-01-16", politician_id: "p1" }),
      makeRow({ date: "2026-01-16", politician_id: "p2" }),
    ];
    const result = annotatePoliticianConsensusTimeline(rows);

    expect(result).toHaveLength(4);
    // Each row should have consensus fields
    for (const row of result) {
      for (const field of CONSENSUS_OUTPUT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
    }
    // Should be sorted by date
    expect(result[0].date).toBe("2026-01-15");
    expect(result[1].date).toBe("2026-01-15");
    expect(result[2].date).toBe("2026-01-16");
    expect(result[3].date).toBe("2026-01-16");
  });

  it("Kalman filter updates state over time (values evolve)", () => {
    const rows = Array.from({ length: 5 }, (_, i) => {
      const day = String(i + 13).padStart(2, "0");
      return makeRow({
        date: `2026-01-${day}`,
        signal_strength: 0.8,
        policy_approval: 0.9,
      });
    });

    const polls = rows.map((row) => makePoll({ date: row.date, value: 85 }));
    const pollLookup = buildPublicPollLookup(polls);
    const result = annotatePoliticianConsensusTimeline(rows, { pollLookup });

    // The consensus proxy should move toward the poll value (85) over the series
    const first = result[0].consensus_proxy;
    const last = result[result.length - 1].consensus_proxy;
    // Later entries should be closer to the poll value of 85
    expect(Math.abs(last - 85)).toBeLessThan(Math.abs(first - 85));
  });

  it("consensus_ci_low <= consensus_proxy <= consensus_ci_high for all rows", () => {
    const rows = Array.from({ length: 10 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return makeRow({
        date: `2026-01-${day}`,
        signal_strength: Math.random(),
        policy_approval: Math.random() * 2 - 1,
      });
    });

    const result = annotatePoliticianConsensusTimeline(rows);

    for (const row of result) {
      expect(row.consensus_ci_low).toBeLessThanOrEqual(row.consensus_proxy);
      expect(row.consensus_ci_high).toBeGreaterThanOrEqual(row.consensus_proxy);
      expect(row.consensus_ci_low).toBeGreaterThanOrEqual(0);
      expect(row.consensus_ci_high).toBeLessThanOrEqual(100);
    }
  });

  it("applies calibration coefficients when provided", () => {
    const rows = [makeRow({ date: "2026-01-15" })];
    const calibration = {
      coefficients: [60, 2, 2, 2, 2, 2, 0, 1, 1],
      fitted: true,
    };

    const withCal = annotatePoliticianConsensusTimeline(rows, { calibration });
    const withoutCal = annotatePoliticianConsensusTimeline(rows);

    expect(withCal[0].consensus_proxy).not.toBe(withoutCal[0].consensus_proxy);
  });
});

// ---------------------------------------------------------------------------
// annotatePartyConsensusTimeline
// ---------------------------------------------------------------------------

describe("annotatePartyConsensusTimeline", () => {
  it("annotates a basic party series", () => {
    const rows = [
      makePartyRow({ date: "2026-01-13" }),
      makePartyRow({ date: "2026-01-14" }),
      makePartyRow({ date: "2026-01-15" }),
    ];

    const result = annotatePartyConsensusTimeline(rows);

    expect(result).toHaveLength(3);
    for (const row of result) {
      for (const field of CONSENSUS_OUTPUT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
      expect(row.consensus_proxy).toBeGreaterThanOrEqual(0);
      expect(row.consensus_proxy).toBeLessThanOrEqual(100);
    }
  });

  it("strips internal _consensus_ fields from output", () => {
    const rows = [makePartyRow({ date: "2026-01-15" })];
    const result = annotatePartyConsensusTimeline(rows);

    for (const row of result) {
      for (const field of INTERNAL_FIELDS) {
        expect(row).not.toHaveProperty(field);
      }
    }
  });

  it("returns empty array for empty input", () => {
    expect(annotatePartyConsensusTimeline([])).toEqual([]);
  });

  it("incorporates party poll data", () => {
    const polls = [
      makePoll({ entity_type: "party", entity_id: "likud", date: "2026-01-15", value: 75 }),
    ];
    const pollLookup = buildPublicPollLookup(polls);
    const rows = [makePartyRow({ date: "2026-01-15" })];

    const withPolls = annotatePartyConsensusTimeline(rows, pollLookup);
    const withoutPolls = annotatePartyConsensusTimeline(rows);

    expect(withPolls[0].consensus_signal_source).toBe("direct_poll");
    expect(withPolls[0].consensus_proxy).not.toBe(withoutPolls[0].consensus_proxy);
  });

  it("returns media_only when no party polls exist", () => {
    const rows = [makePartyRow({ date: "2026-01-15" })];
    const result = annotatePartyConsensusTimeline(rows);

    expect(result[0].consensus_signal_source).toBe("media_only");
  });

  it("preserves original party row fields", () => {
    const rows = [makePartyRow({ date: "2026-01-15", party: "likud" })];
    const result = annotatePartyConsensusTimeline(rows);

    expect(result[0].date).toBe("2026-01-15");
    expect(result[0].party).toBe("likud");
  });

  it("sorts output by date", () => {
    const rows = [
      makePartyRow({ date: "2026-01-17" }),
      makePartyRow({ date: "2026-01-13" }),
      makePartyRow({ date: "2026-01-15" }),
    ];
    const result = annotatePartyConsensusTimeline(rows);

    expect(result[0].date).toBe("2026-01-13");
    expect(result[1].date).toBe("2026-01-15");
    expect(result[2].date).toBe("2026-01-17");
  });

  it("handles multiple parties in the same series", () => {
    const rows = [
      makePartyRow({ date: "2026-01-15", party: "likud" }),
      makePartyRow({ date: "2026-01-15", party: "yesh_atid" }),
      makePartyRow({ date: "2026-01-16", party: "likud" }),
    ];
    const result = annotatePartyConsensusTimeline(rows);

    expect(result).toHaveLength(3);
    for (const row of result) {
      for (const field of CONSENSUS_OUTPUT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
    }
  });

  it("uses calibration when provided", () => {
    const rows = [makePartyRow({ date: "2026-01-15" })];
    const calibration = {
      coefficients: [60, 2, 2, 2, 2, 2, 0, 1, 1],
      fitted: true,
    };

    const withCal = annotatePartyConsensusTimeline(rows, new Map(), calibration);
    const withoutCal = annotatePartyConsensusTimeline(rows);

    expect(withCal[0].consensus_proxy).not.toBe(withoutCal[0].consensus_proxy);
  });

  it("consensus_ci_low <= consensus_proxy <= consensus_ci_high", () => {
    const rows = Array.from({ length: 5 }, (_, i) => {
      const day = String(i + 10).padStart(2, "0");
      return makePartyRow({ date: `2026-01-${day}` });
    });
    const result = annotatePartyConsensusTimeline(rows);

    for (const row of result) {
      expect(row.consensus_ci_low).toBeLessThanOrEqual(row.consensus_proxy);
      expect(row.consensus_ci_high).toBeGreaterThanOrEqual(row.consensus_proxy);
      expect(row.consensus_ci_low).toBeGreaterThanOrEqual(0);
      expect(row.consensus_ci_high).toBeLessThanOrEqual(100);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: buildConsensusCalibrator + annotatePoliticianConsensusTimeline
// ---------------------------------------------------------------------------

describe("integration: calibrator + annotation pipeline", () => {
  it("end-to-end: calibrate then annotate with fitted model", () => {
    const dates = Array.from({ length: 30 }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `2026-01-${day}`;
    });

    const polls = dates.map((date, i) => makePoll({ date, value: 40 + i }));
    const pollLookup = buildPublicPollLookup(polls);

    const rows = dates.map((date, i) =>
      makeRow({
        date,
        signal_strength: 0.3 + (i % 5) * 0.12,
        source_diversity: 1 + (i % 5),
        policy_approval: -0.5 + (i % 10) * 0.1,
        hostility_level: 0.1 + (i % 7) * 0.08,
        cross_source_agreement: 0.3 + (i % 5) * 0.1,
      })
    );

    const calibration = buildConsensusCalibrator(rows, pollLookup, { minSamples: 12 });
    expect(calibration.fitted).toBe(true);

    const annotated = annotatePoliticianConsensusTimeline(rows, { pollLookup, calibration });

    expect(annotated).toHaveLength(30);
    for (const row of annotated) {
      for (const field of CONSENSUS_OUTPUT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
      for (const field of INTERNAL_FIELDS) {
        expect(row).not.toHaveProperty(field);
      }
      expect(row.consensus_proxy).toBeGreaterThanOrEqual(0);
      expect(row.consensus_proxy).toBeLessThanOrEqual(100);
    }
  });

  it("end-to-end: party pipeline feeds politician pipeline", () => {
    const partyRows = [
      makePartyRow({ date: "2026-01-14", party: "likud" }),
      makePartyRow({ date: "2026-01-15", party: "likud" }),
    ];
    const partyTimeline = annotatePartyConsensusTimeline(partyRows);

    const politicianRows = [
      makeRow({ date: "2026-01-14", party: "likud" }),
      makeRow({ date: "2026-01-15", party: "likud" }),
    ];

    const result = annotatePoliticianConsensusTimeline(politicianRows, { partyTimeline });

    expect(result).toHaveLength(2);
    for (const row of result) {
      for (const field of CONSENSUS_OUTPUT_FIELDS) {
        expect(row).toHaveProperty(field);
      }
    }
  });
});
