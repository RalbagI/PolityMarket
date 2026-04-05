import { resolveSignalDisplayScore } from "./signalMode";

/**
 * Extract the last `days` values of a signal for a given entity from summary data.
 *
 * @param {Array} summaryData - Full timeseries summary array
 * @param {string} entityKey - politician_id or party name to match
 * @param {string} signalMode - "media_climate" | "consensus_proxy"
 * @param {number} [days=7] - Number of most-recent data points to return
 * @returns {number[]} Array of signal values (no nulls)
 */
export default function getSparklineData(summaryData, entityKey, signalMode, days = 7) {
  if (!summaryData?.length || !entityKey) return [];

  // Filter entries for the target entity
  const entries = summaryData.filter(
    (e) => e.politician_id === entityKey || e.party === entityKey || e.name === entityKey
  );

  if (!entries.length) return [];

  // Sort by date ascending, take last N
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const recent = sorted.slice(-days);

  // Resolve display scores, filtering out non-finite values
  return recent
    .map((e) => resolveSignalDisplayScore(e, signalMode))
    .filter((v) => Number.isFinite(v));
}
