/**
 * Dynamically re-normalize scores for the visible politician subset.
 * Maps overall_score and media_volume to 0-1 relative scale based on
 * the current min/max of the visible set — not the global dataset.
 *
 * This ensures the treemap fills the viewport meaningfully even when
 * 50+ politicians are filtered out.
 */
export default function normalizeScores(visiblePoliticians) {
  if (!visiblePoliticians.length) return [];

  const scores = visiblePoliticians.map((p) => p.overall_score);
  const volumes = visiblePoliticians.map((p) => p.media_volume);

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const minVolume = Math.min(...volumes);
  const maxVolume = Math.max(...volumes);

  const scoreRange = maxScore - minScore || 1;
  const volumeRange = maxVolume - minVolume || 1;

  return visiblePoliticians.map((p) => ({
    ...p,
    normalizedScore: (p.overall_score - minScore) / scoreRange,
    normalizedVolume: (p.media_volume - minVolume) / volumeRange,
    // Ensure minimum visible size in treemap
    treemapValue: Math.max(p.media_volume, minVolume + volumeRange * 0.1),
  }));
}
