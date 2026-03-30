/**
 * Volatility calculation utilities for politician sentiment scores.
 *
 * Computes rolling standard deviation and detects abnormal shifts
 * using a configurable sigma threshold (default 2σ).
 */

/**
 * Compute rolling population standard deviation over a numeric array.
 * Mirrors the pattern of src/lib/sma.js — handles nulls gracefully.
 *
 * @param {(number|null)[]} values - Input values sorted chronologically
 * @param {number} window - Rolling window size (e.g., 14)
 * @returns {(number|null)[]} StdDev values, same length as input
 */
export function computeRollingStdDev(values, window) {
  return values.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((v) => v != null);
    if (slice.length < 2) return null;

    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / slice.length;
    return parseFloat(Math.sqrt(variance).toFixed(4));
  });
}

/**
 * Compute rolling mean over a numeric array.
 *
 * @param {(number|null)[]} values - Input values
 * @param {number} window - Rolling window size
 * @returns {(number|null)[]} Mean values, same length as input
 */
export function computeRollingMean(values, window) {
  return values.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((v) => v != null);
    if (slice.length === 0) return null;
    return parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(4));
  });
}

/**
 * Detect whether the latest data point breaches the volatility threshold.
 *
 * @param {(number|null)[]} series - Score history sorted by date (oldest first)
 * @param {number} window - Rolling window size (default 14)
 * @param {number} sigmaThreshold - Number of standard deviations for breach (default 2)
 * @returns {{ isBreaching: boolean, currentSigma: number|null, mean: number|null, stddev: number|null, direction: "up"|"down"|null }}
 */
export function detectVolatilityBreach(series, window = 14, sigmaThreshold = 2) {
  const stddevs = computeRollingStdDev(series, window);
  const means = computeRollingMean(series, window);

  const lastIndex = series.length - 1;
  const latest = series[lastIndex];
  const mean = means[lastIndex];
  const stddev = stddevs[lastIndex];

  if (latest == null || mean == null || stddev == null || stddev === 0) {
    return { isBreaching: false, currentSigma: null, mean, stddev, direction: null };
  }

  const currentSigma = parseFloat(((latest - mean) / stddev).toFixed(2));
  const isBreaching = Math.abs(currentSigma) >= sigmaThreshold;
  const direction = currentSigma > 0 ? "up" : currentSigma < 0 ? "down" : null;

  return { isBreaching, currentSigma, mean, stddev, direction };
}

/**
 * Generate volatility data for all politicians from the summary timeseries.
 *
 * @param {Array<{date: string, politician_id: string, name: string, overall_score: number, media_volume: number}>} summaryRows
 * @param {number} [window=14] - Rolling window size
 * @param {number} [sigmaThreshold=2] - Sigma threshold for breach
 * @returns {object} Volatility data object ready to write as JSON
 */
export function generateVolatilityData(summaryRows, window = 14, sigmaThreshold = 2) {
  // Group by politician_id
  const grouped = new Map();
  for (const row of summaryRows) {
    if (!grouped.has(row.politician_id)) {
      grouped.set(row.politician_id, []);
    }
    grouped.get(row.politician_id).push(row);
  }

  const politicians = {};

  for (const [id, rows] of grouped) {
    // Sort by date ascending
    rows.sort((a, b) => a.date.localeCompare(b.date));

    const overallScores = rows.map((r) => r.overall_score ?? null);
    const mediaVolumes = rows.map((r) => r.media_volume ?? null);

    const scoreBreach = detectVolatilityBreach(overallScores, window, sigmaThreshold);
    const volumeBreach = detectVolatilityBreach(mediaVolumes, window, sigmaThreshold);

    const latest = rows[rows.length - 1];

    politicians[id] = {
      name: latest.name,
      overall_score_stddev: scoreBreach.stddev,
      overall_score_mean: scoreBreach.mean,
      overall_score_latest: latest.overall_score,
      overall_score_sigma: scoreBreach.currentSigma,
      media_volume_stddev: volumeBreach.stddev,
      media_volume_mean: volumeBreach.mean,
      media_volume_latest: latest.media_volume,
      media_volume_sigma: volumeBreach.currentSigma,
      is_volatile: scoreBreach.isBreaching || volumeBreach.isBreaching,
      direction: scoreBreach.isBreaching
        ? scoreBreach.direction
        : volumeBreach.isBreaching
          ? volumeBreach.direction
          : null,
    };
  }

  return {
    generated_at: new Date().toISOString(),
    window,
    sigma_threshold: sigmaThreshold,
    politicians,
  };
}
