import { annotateMarketTimeline } from "./marketScore";

export const REQUIRED_MARKET_FIELDS = [
  "market_score",
  "market_percentile",
  "market_tier",
  "market_delta_points",
  "market_delta_pct",
];

export function hasRequiredMarketFields(entry) {
  return REQUIRED_MARKET_FIELDS.every((field) => field in (entry || {}));
}

export function getStoredOrAnnotatedMarketTimeline(rows, entityKey) {
  if (!rows.length) return [];
  return rows.every(hasRequiredMarketFields) ? rows : annotateMarketTimeline(rows, { entityKey });
}

export function derivePartyTimelineFromSummary(summaryRows) {
  const byDateAndParty = new Map();

  for (const entry of summaryRows) {
    const key = `${entry.date}::${entry.party}`;
    if (!byDateAndParty.has(key)) byDateAndParty.set(key, []);
    byDateAndParty.get(key).push(entry);
  }

  return [...byDateAndParty.values()]
    .map((members) => {
      const sample = members[0];
      const totalVolume = members.reduce((sum, member) => sum + (member.media_volume || 0), 0);
      const weightedScore =
        totalVolume > 0
          ? members.reduce((sum, member) => sum + member.overall_score * member.media_volume, 0) /
            totalVolume
          : members.reduce((sum, member) => sum + member.overall_score, 0) / members.length;
      const scores = members.map((member) => member.overall_score);
      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance =
        scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / Math.max(scores.length, 1);
      const topMember = members.reduce((best, member) =>
        (member.media_volume || 0) > (best?.media_volume || 0) ? member : best
      );

      return {
        date: sample.date,
        party: sample.party,
        wing: sample.wing || null,
        member_count: members.length,
        overall_score: parseFloat(weightedScore.toFixed(1)),
        media_volume: parseFloat(totalVolume.toFixed(1)),
        hostility_avg: null,
        policy_avg: null,
        amplification_avg: null,
        top_politician: topMember?.politician_id || null,
        score_stddev: parseFloat(Math.sqrt(variance).toFixed(2)),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.party.localeCompare(b.party));
}
