/**
 * Deterministic overall score computation from dimensional rubrics.
 * Shared between pipeline (generateDailyScores.js) and tests.
 */

// ── Original 3-dimension formula ─────────────────────────────────────────────
// Kept for backward compat with validateDrift.js and existing tests.

export const WEIGHT_POLICY = 0.4;
export const WEIGHT_HOSTILITY = 0.35;
export const WEIGHT_AMPLIFICATION = 0.25;

export default function computeOverallScore(hostility, policyApproval, mediaAmplification) {
  const policyNormalized = (policyApproval + 1) / 2;
  const inverseHostility = 1 - hostility;
  const raw =
    WEIGHT_POLICY * policyNormalized +
    WEIGHT_HOSTILITY * inverseHostility +
    WEIGHT_AMPLIFICATION * mediaAmplification;
  return parseFloat((raw * 10).toFixed(1));
}

// ── 8-dimension formula ───────────────────────────────────────────────────────

/**
 * Base weights for 8-dimension scoring (must sum to 1.0).
 * When a dimension is null, its weight is redistributed proportionally.
 */
export const WEIGHTS_8DIM = {
  dim_public_sentiment: 0.25,
  dim_parliamentary_activity: 0.18,
  dim_media_credibility: 0.12,
  dim_transparency_ethics: 0.12,
  dim_field_activity: 0.10,
  dim_satire_cultural_impact: 0.10,
  dim_legislative_quality: 0.08,
  dim_flipflop_index: 0.05,
};

/**
 * Wing-group classification for coalition/opposition bias mitigation.
 * Coalition wings typically face different structural incentives.
 */
const COALITION_WINGS = new Set(["right", "religious"]);

/**
 * Compute the 8-dimension overall score.
 *
 * @param {Object} dims - Dimension scores (keys match WEIGHTS_8DIM); null = unavailable
 * @param {string} [wing] - Politician's wing ("right"|"center"|"left"|"arab")
 * @param {number} [agendaBonus] - Pre-computed agenda bonus (±0.5 pts)
 * @returns {number} overall_score on 0–10 scale, 1 decimal place
 */
export function computeOverallScore8dim(dims, wing, agendaBonus = 0) {
  // Collect non-null dimension scores with their base weights
  const activeDims = Object.entries(WEIGHTS_8DIM).filter(
    ([key]) => dims[key] != null && Number.isFinite(dims[key])
  );

  if (activeDims.length === 0) {
    // Fallback: use only public_sentiment if all structured dims are null
    const sentiment = dims.dim_public_sentiment ?? 0.5;
    return parseFloat(Math.max(0, Math.min(10, sentiment * 10)).toFixed(1));
  }

  // Null-aware weighted average: redistribute missing weights proportionally
  const totalBaseWeight = activeDims.reduce((s, [, w]) => s + w, 0);

  let raw = 0;
  for (const [key, baseWeight] of activeDims) {
    const normalizedWeight = baseWeight / totalBaseWeight;
    let dimValue = dims[key];

    // Flip-flop index: lower contradictions = higher contribution (invert)
    if (key === "dim_flipflop_index") {
      dimValue = 1 - dimValue;
    }

    raw += normalizedWeight * dimValue;
  }

  // Apply agenda bonus (±0.5 raw points on 0–10 scale)
  const bonusClamped = Math.max(-0.5, Math.min(0.5, Number(agendaBonus) || 0));
  const scaled = raw * 10 + bonusClamped;

  return parseFloat(Math.max(0, Math.min(10, scaled)).toFixed(1));
}

/**
 * Compute the dim_public_sentiment score from the original 3 LLM sub-scores.
 * This consolidates the legacy formula as a single sub-score within the 8-dim system.
 *
 * @param {number} hostility       - 0–1
 * @param {number} policyApproval  - -1 to 1
 * @param {number} amplification   - 0–1
 * @returns {number} 0–1 normalized
 */
export function computePublicSentiment(hostility, policyApproval, amplification) {
  const policyNorm = (policyApproval + 1) / 2;
  const inverseHostility = 1 - hostility;
  return (
    WEIGHT_POLICY * policyNorm +
    WEIGHT_HOSTILITY * inverseHostility +
    WEIGHT_AMPLIFICATION * amplification
  );
}

/**
 * Compute the dim_parliamentary_activity score from OpenKnesset data.
 *
 * @param {Object|null} okData - { attendance_rate, committee_rate, initiative_score }
 * @returns {number|null}
 */
export function computeParliamentaryActivity(okData) {
  if (!okData) return null;
  const { attendance_rate, committee_rate, initiative_score } = okData;
  if (attendance_rate == null && committee_rate == null) return null;

  const a = attendance_rate ?? 0.5;
  const c = committee_rate ?? 0.5;
  const i = initiative_score ?? 0;

  return Math.max(0, Math.min(1, 0.5 * a + 0.3 * c + 0.2 * i));
}

/**
 * Compute the dim_media_credibility score.
 *
 * @param {number} llmScore        - LLM credibility estimate 0–1
 * @param {number|null} factCheck  - Scraped fact-check score 0–1, or null
 * @returns {number}
 */
export function computeMediaCredibility(llmScore, factCheck) {
  if (factCheck != null && Number.isFinite(factCheck)) {
    return Math.max(0, Math.min(1, 0.7 * llmScore + 0.3 * factCheck));
  }
  return Math.max(0, Math.min(1, llmScore));
}

/**
 * Compute the dim_transparency_ethics score.
 *
 * @param {number} llmScore           - LLM transparency estimate 0–1
 * @param {number} lobbyistMeetings   - Count of lobbyist meetings (0–5+)
 * @returns {number}
 */
export function computeTransparencyEthics(llmScore, lobbyistMeetings) {
  const penalty = Math.min(0.3, (Number(lobbyistMeetings) || 0) * 0.05);
  return Math.max(0, Math.min(1, llmScore - penalty));
}

/**
 * Compute the dim_satire_cultural_impact score.
 * High satire presence = high cultural relevance (NOT penalized).
 *
 * @param {number} mentionsCount - Count of satire mentions (0–5+)
 * @param {"mockery"|"affectionate"|"neutral"} tone
 * @returns {number}
 */
export function computeSatireCulturalImpact(mentionsCount, tone) {
  const TONE_FACTORS = { affectionate: 1.0, neutral: 0.85, mockery: 0.6 };
  const factor = TONE_FACTORS[tone] ?? 0.85;
  const raw = Math.min(1, (Number(mentionsCount) || 0) / 3);
  return Math.max(0, Math.min(1, raw * factor));
}

/**
 * Compute the dim_field_activity score.
 *
 * @param {number} confirmedActivities - Count of confirmed field events (0–5+)
 * @returns {number}
 */
export function computeFieldActivity(confirmedActivities) {
  return Math.min(1, (Number(confirmedActivities) || 0) / 3);
}

/**
 * Compute the dim_legislative_quality score.
 *
 * @param {number} proSocioeconomicRatio - 0–1 from LLM vote classification
 * @param {number} mmmRequestsCount      - MMM research requests count
 * @returns {number}
 */
export function computeLegislativeQuality(proSocioeconomicRatio, mmmRequestsCount) {
  const mmm = Math.min(1, (Number(mmmRequestsCount) || 0) / 2);
  return Math.max(
    0,
    Math.min(1, 0.7 * (Number(proSocioeconomicRatio) || 0.5) + 0.3 * mmm)
  );
}

/**
 * Compute the dim_flipflop_index score (0–1; lower = more contradictions).
 * The main formula inverts this (1 - flipflop) so less flip-flopping → higher score.
 *
 * @param {number} contradictions  - Confirmed contradictions found
 * @param {number} promisesChecked - Total promises evaluated
 * @returns {number|null} null when no promises were checked
 */
export function computeFlipFlopIndex(contradictions, promisesChecked) {
  const checked = Number(promisesChecked) || 0;
  if (checked === 0) return null; // No data — exclude from formula
  return Math.min(1, (Number(contradictions) || 0) / checked);
}

/**
 * Compute the agenda_bonus points from the LLM agenda_setting_score.
 * Range: ±0.5 pts applied to the final 0–10 score.
 *
 * @param {number} agendaSettingScore - LLM output: -1.0 to 1.0
 * @returns {number} bonus in range [-0.5, 0.5]
 */
export function computeAgendaBonus(agendaSettingScore) {
  return Math.max(-0.5, Math.min(0.5, (Number(agendaSettingScore) || 0) * 0.5));
}

/**
 * Apply wing-relative normalization to a dimension score.
 * Re-centers each coalition/opposition group around 0.5 with ±0.15 for 1σ.
 * Modifies entries in-place.
 *
 * @param {Object[]} entries  - Array of politician entries (must have .wing and .[key])
 * @param {string}   key      - Dimension key to normalize
 */
export function applyWingRelativeNorm(entries, key) {
  function groupOf(wing) {
    return COALITION_WINGS.has(wing) ? "coalition" : "opposition";
  }

  for (const group of ["coalition", "opposition"]) {
    const subset = entries.filter(
      (e) => groupOf(e.wing) === group && e[key] != null && Number.isFinite(e[key])
    );
    if (subset.length < 2) continue;

    const mean = subset.reduce((s, e) => s + e[key], 0) / subset.length;
    const std = Math.sqrt(
      subset.reduce((s, e) => s + (e[key] - mean) ** 2, 0) / subset.length
    );

    if (std < 0.001) continue; // All identical — no normalization needed

    for (const e of subset) {
      e[key] = Math.max(0, Math.min(1, 0.5 + ((e[key] - mean) / std) * 0.15));
    }
  }
}
