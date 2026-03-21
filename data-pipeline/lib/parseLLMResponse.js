import { z } from "zod";

/**
 * Zod schema for LLM dimensional rubric responses.
 * Matches the expected output from the CoT system prompt.
 */
export const llmResponseSchema = z.object({
  chain_of_thought: z.string().min(1, "chain_of_thought must not be empty"),
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
 * Schema for a fully processed daily entry (after deterministic score computation).
 * Used to validate data before writing to public/data/.
 */
export const dailyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  politician_id: z.string().min(1),
  name: z.string().min(1),
  party: z.string().min(1),
  role: z.enum(["mk", "minister", "deputy-minister", "politician"]).default("mk"),
  hostility_level: z.number().min(0).max(1),
  policy_approval: z.number().min(-1).max(1),
  media_amplification: z.number().min(0).max(1),
  overall_score: z.number().min(0).max(10),
  chain_of_thought: z.string().min(1),
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

/**
 * Schema for summary rows written to timeseries_summary.json.
 */
export const summaryRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  politician_id: z.string().min(1),
  name: z.string().min(1),
  party: z.string().min(1),
  role: z.enum(["mk", "minister", "deputy-minister", "politician"]).default("mk"),
  overall_score: z.number().min(0).max(10),
  media_volume: z.number().min(0).max(10),
});

/**
 * Validates and parses raw LLM JSON responses.
 * Strips markdown code fences, then validates against zod schema.
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
    throw new Error(`Invalid JSON from LLM: ${e.message}\nRaw: ${cleaned.slice(0, 200)}`);
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
