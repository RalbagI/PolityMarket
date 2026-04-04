import { useMemo } from "react";
import { getPartyColor } from "./partyColors";
import { resolveSignalDisplayScore } from "./signalMode";

export default function useSidebarStats(todayData, signalMode = "media_climate") {
  return useMemo(() => {
    if (!todayData.length) {
      return { total: 0, weightedAvg: 0, parties: [] };
    }

    const totalVolume = todayData.reduce((s, d) => s + d.media_volume, 0);
    const weightedSum = todayData.reduce(
      (sum, entry) => sum + (resolveSignalDisplayScore(entry, signalMode) ?? 0) * entry.media_volume,
      0
    );
    const weightedAvg = totalVolume > 0 ? weightedSum / totalVolume : 0;

    const partyMap = {};
    for (const d of todayData) {
      partyMap[d.party] = (partyMap[d.party] || 0) + 1;
    }
    const parties = Object.entries(partyMap)
      .map(([party, count]) => ({ party, count, color: getPartyColor(party) }))
      .sort((a, b) => b.count - a.count);

    return { total: todayData.length, weightedAvg, parties };
  }, [signalMode, todayData]);
}
