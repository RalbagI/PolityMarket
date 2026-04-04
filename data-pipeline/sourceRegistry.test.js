import { describe, expect, it } from "vitest";
import {
  buildSourceBaselines,
  computeCoverageAndConsensusFeatures,
} from "./lib/sourceRegistry.js";

describe("sourceRegistry consensus features", () => {
  it("counts each source once per entry when building baselines", () => {
    const baselines = buildSourceBaselines([
      {
        date: "2026-04-01",
        policy_approval: 0.6,
        hostility_level: 0.2,
        media_amplification: 0.7,
        evidence_items: [
          { source_id: "ynet" },
          { source_id: "ynet" },
          { source_id: "walla" },
        ],
      },
      {
        date: "2026-04-02",
        policy_approval: 0.2,
        hostility_level: 0.5,
        media_amplification: 0.4,
        evidence_items: [{ source_id: "ynet" }],
      },
    ]);

    expect(baselines.get("ynet")).toMatchObject({
      policy_mean: 0.4,
      amplification_mean: 0.55,
    });
    expect(baselines.get("walla")).toMatchObject({
      policy_mean: 0.6,
      amplification_mean: 0.7,
    });
  });

  it("weights each source once per entity-day when computing consensus features", () => {
    const features = computeCoverageAndConsensusFeatures(
      {
        policy_approval: 0.6,
        hostility_level: 0.2,
        media_amplification: 0.7,
        media_volume: 4,
      },
      [
        {
          source_id: "ynet",
          source_name: "Ynet",
          url: "https://www.ynet.co.il/story-a",
          is_direct_entity_match: true,
        },
        {
          source_id: "ynet",
          source_name: "Ynet",
          url: "https://www.ynet.co.il/story-b",
          is_direct_entity_match: false,
        },
        {
          source_id: "walla",
          source_name: "Walla",
          url: "https://www.walla.co.il/story",
          is_direct_entity_match: true,
        },
      ],
      new Map([
        [
          "ynet",
          {
            policy_mean: 0.4,
            policy_stddev: 0.2,
            inverse_hostility_mean: 0.5,
            inverse_hostility_stddev: 0.2,
            amplification_mean: 0.5,
            amplification_stddev: 0.2,
          },
        ],
        [
          "walla",
          {
            policy_mean: 0.5,
            policy_stddev: 0.2,
            inverse_hostility_mean: 0.6,
            inverse_hostility_stddev: 0.2,
            amplification_mean: 0.6,
            amplification_stddev: 0.2,
          },
        ],
      ])
    );

    expect(features.source_diversity).toBe(2);
    expect(features.has_direct_coverage).toBe(true);
    expect(features.policy_rel_z).not.toBe(1);
  });

  it("excludes sources marked out of consensus weighting", () => {
    const features = computeCoverageAndConsensusFeatures(
      {
        policy_approval: 0.6,
        hostility_level: 0.2,
        media_amplification: 0.7,
        media_volume: 4,
      },
      [
        {
          source_id: "ynet",
          source_name: "Ynet",
          url: "https://www.ynet.co.il/story-a",
          is_direct_entity_match: true,
        },
        {
          source_id: "pipeline",
          source_name: "pipeline",
          url: "https://example.com/fallback",
          is_direct_entity_match: true,
        },
      ],
      new Map([
        [
          "ynet",
          {
            policy_mean: 0.4,
            policy_stddev: 0.2,
            inverse_hostility_mean: 0.5,
            inverse_hostility_stddev: 0.2,
            amplification_mean: 0.5,
            amplification_stddev: 0.2,
          },
        ],
      ])
    );

    expect(features.source_diversity).toBe(1);
    expect(features.has_direct_coverage).toBe(true);
    expect(features.mainstream_share).toBe(1);
    expect(features.social_share).toBe(0);
  });
});
