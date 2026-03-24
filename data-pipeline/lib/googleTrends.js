/**
 * Google Trends interest score for Israeli politicians.
 *
 * Uses the unofficial `google-trends-api` npm package.
 * FRAGILE: unofficial endpoints may break at any time.
 *
 * All errors return null — never throws.
 * Output is an optional amplifier for `agenda_setting_score` only;
 * the dimension works without it.
 */

/** In-memory cache: query → number|null */
const _cache = new Map();

/**
 * Fetch normalized Google Trends interest for a politician name.
 *
 * @param {string} query       - Hebrew or English politician name
 * @param {number} windowDays  - Lookback window in days (default: 7)
 * @returns {Promise<number|null>} 0–1 normalized interest, or null
 */
export async function fetchTrendScore(query, windowDays = 7) {
  if (_cache.has(query)) return _cache.get(query);

  try {
    // Dynamic import so missing package causes graceful null, not a startup crash
    let googleTrends;
    try {
      const mod = await import("google-trends-api");
      googleTrends = mod.default ?? mod;
    } catch {
      // Package not installed — silently skip
      _cache.set(query, null);
      return null;
    }

    const startTime = new Date();
    startTime.setDate(startTime.getDate() - (Number(windowDays) || 7));

    const rawData = await googleTrends.interestOverTime({
      keyword: query,
      startTime,
      geo: "IL",
    });

    if (!rawData) {
      _cache.set(query, null);
      return null;
    }

    const parsed = JSON.parse(rawData);
    const timeline = parsed?.default?.timelineData ?? [];

    if (timeline.length === 0) {
      _cache.set(query, null);
      return null;
    }

    // Average interest over the window, normalize 0–100 → 0–1
    const values = timeline.map((t) => Number(t.value?.[0] ?? 0));
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const score = Math.min(1, avg / 100);

    _cache.set(query, score);
    return score;
  } catch (err) {
    console.warn(`[GoogleTrends] Failed for "${query}": ${err.message}`);
    _cache.set(query, null);
    return null;
  }
}

/** Clear cache between runs and in tests. */
export function clearCache() {
  _cache.clear();
}
