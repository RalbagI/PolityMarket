import { z } from "zod";

/**
 * Zod schema for LLM dimensional rubric responses (original 3-dimension schema).
 * Kept for backward compat with validateDrift.js and existing tests.
 */
export const llmResponseSchema = z.object({
  chain_of_thought: z.string().min(1).nullable(),
  chain_of_thought_en: z.string().min(1).nullable().optional(),
  hostility_level: z
    .number()
    .min(0, "hostility_level must be >= 0")
    .max(1, "hostility_level must be <= 1"),
  policy_approval: z
    .number()
    .min(-1, "policy_approval must be >= -1")
    .max(1, "policy_approval must be <= 1"),
  media_amplification: z
    .number()
    .min(0, "media_amplification must be >= 0")
    .max(1, "media_amplification must be <= 1"),
});

/**
 * Zod schema for 8-dimension LLM responses.
 * Extends the original 3 dimensions with 12 additional fields.
 * Unrecognized extra fields are stripped (passthrough disabled).
 */
export const llmResponseSchema8dim = z.object({
  // Original 3 dimensions (required)
  chain_of_thought: z.string().min(1).nullable(),
  chain_of_thought_en: z.string().min(1).nullable().optional(),
  hostility_level: z.number().min(0).max(1),
  policy_approval: z.number().min(-1).max(1),
  media_amplification: z.number().min(0).max(1),

  // Dimension 3: Media Credibility
  media_credibility_score: z.number().min(0).max(1).default(0.5),
  tv_radio_mentions: z.number().int().min(0).max(10).default(0),

  // Dimension 6: Satire & Cultural Impact
  satire_mentions_count: z.number().int().min(0).max(5).default(0),
  satire_tone: z.enum(["mockery", "affectionate", "neutral"]).default("neutral"),

  // Dimension 5: Field Activity
  field_activities_confirmed: z.number().int().min(0).max(5).default(0),

  // Dimension 4: Transparency & Ethics
  transparency_ethics_score: z.number().min(0).max(1).default(0.5),
  lobbyist_meetings_count: z.number().int().min(0).max(5).default(0),

  // Dimension 7: Legislative Quality
  legislative_pro_socioeconomic_ratio: z.number().min(0).max(1).default(0.5),

  // Agenda Setting bonus (not a weighted dimension)
  agenda_setting_score: z.number().min(-1).max(1).default(0),

  // Dimension 8: Flip-Flop Index
  flipflop_contradictions: z.number().int().min(0).max(10).default(0),
  flipflop_promises_checked: z.number().int().min(0).max(20).default(0),
});

/**
 * Schema for a fully processed daily entry (original 3-dimension schema).
 * Kept for backward compat. New code uses dailyEntrySchema8dim.
 */
export const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  politician_id: z.string().min(1),
  name: z.string().min(1),
  party: z.string().min(1),
  wing: z.string().min(1),
  sector: z.string().min(1),
  role: z.enum(["mk", "minister", "deputy-minister", "politician"]).default("mk"),
  hostility_level: z.number().min(0).max(1),
  policy_approval: z.number().min(-1).max(1),
  media_amplification: z.number().min(0).max(1),
  overall_score: z.number().min(0).max(10),
  chain_of_thought: z.string().min(1).nullable(),
  chain_of_thought_en: z.string().min(1).nullable().optional(),
  news_sentiment: z.number().min(0).max(10),
  social_sentiment: z.number().min(0).max(10),
  media_volume: z.number().min(0).max(10),
  news_headlines: z.array(z.string().min(1)).optional(),
  social_mentions: z
    .array(
      z.object({
        text: z.string().min(1),
        thread_context: z.array(z.string()).optional(),
        speaker_metadata: z
          .object({
            handle: z.string().min(1),
            known_satirist: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .optional(),
});

/** Nullable dimension field helper */
const dimField = () => z.number().min(0).max(1).nullable().optional();
const marketField = () => z.number().min(0).max(100).nullable().optional();
const marketTierField = () => z.enum(["S", "A", "B", "C"]).nullable().optional();
const confidenceField = () => z.number().min(0).max(1).nullable().optional();

const evidenceItemSchema = z.object({
  source_id: z.string().min(1),
  source_name: z.string().min(1),
  source_type: z.enum([
    "mainstream",
    "public_broadcaster",
    "partisan",
    "satire",
    "social",
    "forum",
    "unknown",
  ]),
  url: z.string().optional(),
  published_at: z.string().nullable().optional(),
  matched_text: z.string().min(1),
  entity_snippet: z.string().min(1),
  quote: z.string().min(1),
  is_direct_entity_match: z.boolean(),
});

/**
 * Schema for a fully processed daily entry with 8-dimension sub-scores.
 * All dim_* fields are optional/nullable for backward compat with historical data.
 */
export const dailyEntrySchema8dim = dailyEntrySchema.extend({
  // 8 composite dimension scores (0–1)
  dim_public_sentiment: dimField(),
  dim_parliamentary_activity: dimField(),
  dim_media_credibility: dimField(),
  dim_transparency_ethics: dimField(),
  dim_field_activity: dimField(),
  dim_satire_cultural_impact: dimField(),
  dim_legislative_quality: dimField(),
  dim_flipflop_index: dimField(),

  // Agenda bonus (±0.5 pts, applied to overall_score)
  agenda_setting_score: z.number().min(-1).max(1).nullable().optional(),
  agenda_bonus: z.number().min(-0.5).max(0.5).nullable().optional(),

  // Raw LLM sub-fields for detail file
  media_credibility_llm: dimField(),
  media_credibility_factcheck: dimField(),
  tv_radio_mentions: z.number().int().min(0).nullable().optional(),
  satire_mentions_count: z.number().int().min(0).nullable().optional(),
  satire_tone: z.enum(["mockery", "affectionate", "neutral"]).nullable().optional(),
  field_activities_confirmed: z.number().int().min(0).nullable().optional(),
  asset_disclosure_status: z.enum(["current", "late", "missing"]).nullable().optional(),
  lobbyist_meetings_count: z.number().int().min(0).nullable().optional(),

  // Parliamentary sub-fields from OpenKnesset
  parl_attendance_rate: dimField(),
  parl_committee_rate: dimField(),
  parl_initiative_score: dimField(),
  parl_data_source: z.string().nullable().optional(),

  // Legislative quality sub-fields
  legislative_pro_socioeconomic: dimField(),
  mmm_requests_count: z.number().int().min(0).nullable().optional(),

  // Flip-flop sub-fields
  flipflop_contradictions: z.number().int().min(0).nullable().optional(),
  flipflop_promises_checked: z.number().int().min(0).nullable().optional(),

  // Market score presentation layer
  media_climate_raw: z.number().min(0).max(10).nullable().optional(),
  media_climate_display: marketField(),
  market_score: marketField(),
  market_percentile: marketField(),
  market_tier: marketTierField(),
  market_delta_points: z.number().nullable().optional(),
  market_delta_pct: z.number().nullable().optional(),

  // Coverage and evidence quality
  has_direct_coverage: z.boolean().nullable().optional(),
  signal_strength: confidenceField(),
  source_diversity: z.number().int().min(0).nullable().optional(),
  coverage_confidence: confidenceField(),

  // Debiased source features
  policy_rel_z: z.number().nullable().optional(),
  inverse_hostility_rel_z: z.number().nullable().optional(),
  amplification_weighted: z.number().nullable().optional(),
  cross_source_agreement: confidenceField(),
  mainstream_share: confidenceField(),
  social_share: confidenceField(),
  source_entropy: confidenceField(),

  // Consensus proxy
  consensus_proxy: marketField(),
  consensus_ci_low: marketField(),
  consensus_ci_high: marketField(),
  consensus_signal_source: z
    .enum(["direct_poll", "party_poll+media", "media_only"])
    .nullable()
    .optional(),
  consensus_confidence: confidenceField(),

  // Evidence payload
  evidence_items: z.array(evidenceItemSchema).optional(),
});

/**
 * Schema for summary rows written to timeseries_summary.json (original).
 * Kept for backward compat.
 */
export const summaryRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  politician_id: z.string().min(1),
  name: z.string().min(1),
  party: z.string().min(1),
  wing: z.string().min(1),
  sector: z.string().min(1),
  role: z.enum(["mk", "minister", "deputy-minister", "politician"]).default("mk"),
  overall_score: z.number().min(0).max(10),
  media_volume: z.number().min(0).max(10),
});

/**
 * Schema for 8-dimension summary rows.
 * Extends original summaryRowSchema with optional dim_* fields.
 */
export const summaryRowSchema8dim = summaryRowSchema.extend({
  overall_score_raw: z.number().min(0).max(10).optional(),
  media_climate_raw: z.number().min(0).max(10).nullable().optional(),
  media_climate_display: marketField(),
  dim_public_sentiment: dimField(),
  dim_parliamentary_activity: dimField(),
  dim_media_credibility: dimField(),
  dim_transparency_ethics: dimField(),
  dim_field_activity: dimField(),
  dim_satire_cultural_impact: dimField(),
  dim_legislative_quality: dimField(),
  dim_flipflop_index: dimField(),
  market_score: marketField(),
  market_percentile: marketField(),
  market_tier: marketTierField(),
  market_delta_points: z.number().nullable().optional(),
  market_delta_pct: z.number().nullable().optional(),
  has_direct_coverage: z.boolean().nullable().optional(),
  signal_strength: confidenceField(),
  source_diversity: z.number().int().min(0).nullable().optional(),
  coverage_confidence: confidenceField(),
  policy_rel_z: z.number().nullable().optional(),
  inverse_hostility_rel_z: z.number().nullable().optional(),
  amplification_weighted: z.number().nullable().optional(),
  cross_source_agreement: confidenceField(),
  mainstream_share: confidenceField(),
  social_share: confidenceField(),
  source_entropy: confidenceField(),
  consensus_proxy: marketField(),
  consensus_ci_low: marketField(),
  consensus_ci_high: marketField(),
  consensus_signal_source: z
    .enum(["direct_poll", "party_poll+media", "media_only"])
    .nullable()
    .optional(),
  consensus_confidence: confidenceField(),
});

export const partySummaryRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  party: z.string().min(1),
  wing: z.string().nullable().optional(),
  member_count: z.number().int().nonnegative(),
  overall_score: z.number().min(0).max(10),
  media_volume: z.number().min(0),
  hostility_avg: z.number().nullable().optional(),
  policy_avg: z.number().nullable().optional(),
  amplification_avg: z.number().nullable().optional(),
  top_politician: z.string().min(1).nullable().optional(),
  score_stddev: z.number().nullable().optional(),
  media_climate_raw: z.number().min(0).max(10).nullable().optional(),
  media_climate_display: marketField(),
  market_score: marketField(),
  market_percentile: marketField(),
  market_tier: marketTierField(),
  market_delta_points: z.number().nullable().optional(),
  market_delta_pct: z.number().nullable().optional(),
  has_direct_coverage: z.boolean().nullable().optional(),
  signal_strength: confidenceField(),
  source_diversity: z.number().int().min(0).nullable().optional(),
  coverage_confidence: confidenceField(),
  policy_rel_z: z.number().nullable().optional(),
  inverse_hostility_rel_z: z.number().nullable().optional(),
  amplification_weighted: z.number().nullable().optional(),
  cross_source_agreement: confidenceField(),
  mainstream_share: confidenceField(),
  social_share: confidenceField(),
  source_entropy: confidenceField(),
  consensus_proxy: marketField(),
  consensus_ci_low: marketField(),
  consensus_ci_high: marketField(),
  consensus_signal_source: z
    .enum(["direct_poll", "party_poll+media", "media_only"])
    .nullable()
    .optional(),
  consensus_confidence: confidenceField(),
});

/**
 * Validates and parses raw LLM JSON responses (original 3-dimension).
 * Strips markdown code fences, then validates against llmResponseSchema.
 * Returns validated object or throws with field-level errors.
 */
export default function parseLLMResponse(raw) {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Invalid JSON from LLM: ${e.message}\nRaw: ${cleaned.slice(0, 200)}`, {
      cause: e,
    });
  }

  const result = llmResponseSchema.safeParse(parsed);
  if (!result.success) {
    const fieldErrors = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`LLM response validation failed: ${fieldErrors}`);
  }

  return result.data;
}

/**
 * Validates a single LLM result object against the 8-dimension schema.
 * Returns {success, data, errors} — does not throw.
 *
 * @param {Object} obj - Raw LLM result for one politician
 * @returns {{ success: boolean, data?: Object, errors?: string[] }}
 */
export function parseLLMResponse8dim(obj) {
  const result = llmResponseSchema8dim.safeParse(obj);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { success: false, errors };
  }
  return { success: true, data: result.data };
}
