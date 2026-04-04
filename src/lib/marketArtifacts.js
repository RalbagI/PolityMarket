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
  const timeline = rows.every(hasRequiredMarketFields)
    ? rows
    : annotateMarketTimeline(rows, { entityKey });
  return timeline.map((row) => ({
    ...row,
    media_climate_raw: row.media_climate_raw ?? row.overall_score_raw ?? row.overall_score,
    media_climate_display: row.media_climate_display ?? row.market_score ?? null,
  }));
}

export function derivePartyTimelineFromSummary(summaryRows) {
  const byDateAndParty = new Map();

  const weightedAverage = (members, field, digits = 1) => {
    const validMembers = members.filter((member) => Number.isFinite(member?.[field]));
    if (!validMembers.length) return null;
    const totalWeight = validMembers.reduce(
      (sum, member) => sum + Math.max(member.media_volume || 0, 1),
      0
    );
    const weighted =
      totalWeight > 0
        ? validMembers.reduce(
            (sum, member) => sum + member[field] * Math.max(member.media_volume || 0, 1),
            0
          ) / totalWeight
        : validMembers.reduce((sum, member) => sum + member[field], 0) / validMembers.length;
    return parseFloat(weighted.toFixed(digits));
  };

  const average = (members, field, digits = 2) => {
    const validMembers = members.filter((member) => Number.isFinite(member?.[field]));
    if (!validMembers.length) return null;
    const avg =
      validMembers.reduce((sum, member) => sum + member[field], 0) / validMembers.length;
    return parseFloat(avg.toFixed(digits));
  };

  const signalSourcePriority = {
    direct_poll: 3,
    "party_poll+media": 2,
    media_only: 1,
  };

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
        media_climate_raw: weightedAverage(members, "media_climate_raw", 1),
        media_climate_display: weightedAverage(members, "media_climate_display", 1),
        has_direct_coverage: members.some((member) => member.has_direct_coverage === true),
        signal_strength: average(members, "signal_strength", 3),
        source_diversity: Math.max(
          0,
          ...members.map((member) =>
            Number.isFinite(member?.source_diversity) ? member.source_diversity : 0
          )
        ),
        coverage_confidence: average(members, "coverage_confidence", 3),
        policy_rel_z: average(members, "policy_rel_z", 3),
        inverse_hostility_rel_z: average(members, "inverse_hostility_rel_z", 3),
        amplification_weighted: average(members, "amplification_weighted", 3),
        cross_source_agreement: average(members, "cross_source_agreement", 3),
        mainstream_share: average(members, "mainstream_share", 3),
        social_share: average(members, "social_share", 3),
        source_entropy: average(members, "source_entropy", 3),
        consensus_proxy: weightedAverage(members, "consensus_proxy", 1),
        consensus_ci_low: weightedAverage(members, "consensus_ci_low", 1),
        consensus_ci_high: weightedAverage(members, "consensus_ci_high", 1),
        consensus_signal_source:
          members
            .filter((member) => member?.consensus_signal_source)
            .sort(
              (left, right) =>
                (signalSourcePriority[right.consensus_signal_source] ?? 0) -
                (signalSourcePriority[left.consensus_signal_source] ?? 0)
            )[0]?.consensus_signal_source ?? null,
        consensus_confidence: average(members, "consensus_confidence", 2),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.party.localeCompare(b.party));
}
