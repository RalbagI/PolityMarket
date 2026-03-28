import { useMemo } from "react";
import { scoreToColor } from "./colorScale";
import { getPartyColor } from "./partyColors";

const TIERS = [
  { min: 0, max: 2, key: "tier0_2" },
  { min: 2, max: 4, key: "tier2_4" },
  { min: 4, max: 6, key: "tier4_6" },
  { min: 6, max: 8, key: "tier6_8" },
  { min: 8, max: 10, key: "tier8_10" },
];

export default function useSidebarStats(todayData) {
  return useMemo(() => {
    if (!todayData.length) {
      return { total: 0, weightedAvg: 0, histogram: [], maxCount: 1, parties: [] };
    }

    const totalVolume = todayData.reduce((s, d) => s + d.media_volume, 0);
    const weightedSum = todayData.reduce((s, d) => s + d.overall_score * d.media_volume, 0);
    const weightedAvg = totalVolume > 0 ? weightedSum / totalVolume : 0;

    const histogram = TIERS.map(({ min, max, key }) => ({
      key,
      min,
      max,
      count: todayData.filter((d) => d.overall_score >= min && d.overall_score < max).length,
      color: scoreToColor((min + max) / 2),
    }));
    histogram[4].count = todayData.filter((d) => d.overall_score >= 8).length;
    const maxCount = Math.max(...histogram.map((h) => h.count), 1);

    const partyMap = {};
    for (const d of todayData) {
      partyMap[d.party] = (partyMap[d.party] || 0) + 1;
    }
    const parties = Object.entries(partyMap)
      .map(([party, count]) => ({ party, count, color: getPartyColor(party) }))
      .sort((a, b) => b.count - a.count);

    return { total: todayData.length, weightedAvg, histogram, maxCount, parties };
  }, [todayData]);
}
