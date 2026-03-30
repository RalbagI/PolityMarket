import { useMemo } from "react";
import { getPartyColor } from "./partyColors";

export default function useSidebarStats(todayData) {
  return useMemo(() => {
    if (!todayData.length) {
      return { total: 0, weightedAvg: 0, parties: [] };
    }

    const totalVolume = todayData.reduce((s, d) => s + d.media_volume, 0);
    const weightedSum = todayData.reduce((s, d) => s + d.overall_score * d.media_volume, 0);
    const weightedAvg = totalVolume > 0 ? weightedSum / totalVolume : 0;

    const partyMap = {};
    for (const d of todayData) {
      partyMap[d.party] = (partyMap[d.party] || 0) + 1;
    }
    const parties = Object.entries(partyMap)
      .map(([party, count]) => ({ party, count, color: getPartyColor(party) }))
      .sort((a, b) => b.count - a.count);

    return { total: todayData.length, weightedAvg, parties };
  }, [todayData]);
}
