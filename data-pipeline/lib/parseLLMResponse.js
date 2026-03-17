/**
 * Validates and parses LLM JSON responses.
 * Strips markdown code fences, validates required fields and ranges.
 */
export default function parseLLMResponse(raw) {
  const cleaned = raw
    .replace(/^```json?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.chain_of_thought !== "string" ||
    !parsed.chain_of_thought.length
  ) {
    throw new Error("Missing or empty chain_of_thought");
  }
  if (
    typeof parsed.hostility_level !== "number" ||
    parsed.hostility_level < 0 ||
    parsed.hostility_level > 1
  ) {
    throw new Error(
      `Invalid hostility_level: ${parsed.hostility_level} (must be 0.0–1.0)`
    );
  }
  if (
    typeof parsed.policy_approval !== "number" ||
    parsed.policy_approval < -1 ||
    parsed.policy_approval > 1
  ) {
    throw new Error(
      `Invalid policy_approval: ${parsed.policy_approval} (must be -1.0–1.0)`
    );
  }
  if (
    typeof parsed.media_amplification !== "number" ||
    parsed.media_amplification < 0 ||
    parsed.media_amplification > 1
  ) {
    throw new Error(
      `Invalid media_amplification: ${parsed.media_amplification} (must be 0.0–1.0)`
    );
  }
  return parsed;
}
