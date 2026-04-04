import { resolveSignalDisplayScore } from "./signalMode";

/**
 * Dynamically re-normalize scores for the visible politician subset.
 * Maps market_score and media_volume to 0-1 relative scale based on
 * the current min/max of the visible set — not the global dataset.
 *
 * This ensures the treemap fills the viewport meaningfully even when
 * 50+ politicians are filtered out.
 */
export default function normalizeScores(visiblePoliticians, signalMode = "media_climate") {
  if (!visiblePoliticians.length) return [];

  const resolveScore = (entry) => resolveSignalDisplayScore(entry, signalMode) ?? 0;

  const scores = visiblePoliticians.map(resolveScore);
  const volumes = visiblePoliticians.map((p) => p.media_volume);

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const minVolume = Math.min(...volumes);
  const maxVolume = Math.max(...volumes);

  const scoreRange = maxScore - minScore || 1;
  const volumeRange = maxVolume - minVolume || 1;

  return visiblePoliticians.map((p) => ({
    ...p,
    normalizedScore: (resolveScore(p) - minScore) / scoreRange,
    normalizedVolume: (p.media_volume - minVolume) / volumeRange,
    // Ensure minimum visible size in treemap
    treemapValue: Math.max(p.media_volume, minVolume + volumeRange * 0.1),
  }));
}
