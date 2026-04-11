/**
 * Client-side mirror of data-pipeline/lib/computeScore.js computeOverallScore8dim.
 * Lets the user recompute each politician's overall score under their own weights
 * while preserving the pipeline's null-dimension redistribution rule.
 */

export const DIM_KEYS = [
  "dim_public_sentiment",
  "dim_parliamentary_activity",
  "dim_media_credibility",
  "dim_transparency_ethics",
  "dim_field_activity",
  "dim_satire_cultural_impact",
  "dim_legislative_quality",
  "dim_flipflop_index",
];

// Editorial baseline — must match WEIGHTS_8DIM in the pipeline. Keep in sync.
export const BALANCED_WEIGHTS = Object.freeze({
  dim_public_sentiment: 0.25,
  dim_parliamentary_activity: 0.18,
  dim_media_credibility: 0.12,
  dim_transparency_ethics: 0.12,
  dim_field_activity: 0.1,
  dim_satire_cultural_impact: 0.1,
  dim_legislative_quality: 0.08,
  dim_flipflop_index: 0.05,
});

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Normalize a weights record so values are clamped to [0, ∞) and sum to 1.
 * If every weight is zero or missing, falls back to the balanced preset.
 */
export function normalizeWeights(weights) {
  const out = {};
  let total = 0;
  for (const key of DIM_KEYS) {
    const raw = Number(weights?.[key]);
    const clean = isFiniteNumber(raw) && raw > 0 ? raw : 0;
    out[key] = clean;
    total += clean;
  }
  if (total === 0) return { ...BALANCED_WEIGHTS };
  for (const key of DIM_KEYS) out[key] = out[key] / total;
  return out;
}

/**
 * Recompute overall_score (0–10 scale) for a single entry under user weights,
 * redistributing missing dims proportionally — the same rule the pipeline uses.
 * Returns null if no dimensional data is available.
 */
export function rescoreEntry(entry, userWeights) {
  if (!entry) return null;
  const weights = normalizeWeights(userWeights);

  const present = DIM_KEYS.filter((key) => isFiniteNumber(entry[key]) && weights[key] > 0);
  if (present.length === 0) return null;

  const totalBase = present.reduce((sum, key) => sum + weights[key], 0);
  if (totalBase === 0) return null;

  let raw = 0;
  for (const key of present) {
    const normalized = weights[key] / totalBase;
    raw += normalized * entry[key];
  }

  const scaled = raw * 10;
  return parseFloat(Math.max(0, Math.min(10, scaled)).toFixed(1));
}

/**
 * Apply user weights across a list of entries. Returns a new array with a
 * `your_score` field (0–10) on every entry that has at least one dim score.
 * Entries with no dim data are passed through untouched (no your_score).
 */
export function rescoreEntries(entries, userWeights) {
  if (!Array.isArray(entries)) return [];
  const weights = normalizeWeights(userWeights);
  return entries.map((entry) => {
    const value = rescoreEntry(entry, weights);
    if (value == null) return entry;
    return { ...entry, your_score: value };
  });
}

/** Has the user actually changed the weights from the balanced preset? */
export function weightsAreBalanced(weights) {
  const norm = normalizeWeights(weights);
  for (const key of DIM_KEYS) {
    if (Math.abs(norm[key] - BALANCED_WEIGHTS[key]) > 0.005) return false;
  }
  return true;
}
