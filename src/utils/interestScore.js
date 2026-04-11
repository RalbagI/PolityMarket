function toFiniteOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

function standardize(values) {
  const n = values.length;
  if (!n) return [];
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  if (!std) return values.map(() => 0);
  return values.map((v) => (v - mean) / std);
}

/**
 * interest_score = z(|market_delta_points|) + z(|overall_score_sigma|) + z(media_volume)
 * Non-finite inputs normalize to 0 before z-scoring.
 */
export function computeInterestScores(entries) {
  if (!entries || !entries.length) return [];

  const deltaAbs = entries.map((e) => Math.abs(toFiniteOrZero(e.market_delta_points)));
  const sigmaAbs = entries.map((e) => Math.abs(toFiniteOrZero(e.overall_score_sigma)));
  const volume = entries.map((e) => toFiniteOrZero(e.media_volume));

  const zDelta = standardize(deltaAbs);
  const zSigma = standardize(sigmaAbs);
  const zVolume = standardize(volume);

  return entries.map((entry, i) => ({
    ...entry,
    interest_score: zDelta[i] + zSigma[i] + zVolume[i],
    interest_breakdown: {
      delta: zDelta[i],
      sigma: zSigma[i],
      volume: zVolume[i],
    },
  }));
}
