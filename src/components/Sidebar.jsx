import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { scoreToColor } from "../lib/colorScale";
import { localizeParty } from "../lib/localize";
import { getPartyColor } from "../lib/partyColors";

const TIERS = [
  { min: 0, max: 2, key: "tier0_2" },
  { min: 2, max: 4, key: "tier2_4" },
  { min: 4, max: 6, key: "tier4_6" },
  { min: 6, max: 8, key: "tier6_8" },
  { min: 8, max: 10, key: "tier8_10" },
];

export default function Sidebar({ todayData, onMethodologyClick }) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    if (!todayData.length) return null;

    const totalVolume = todayData.reduce((s, d) => s + d.media_volume, 0);
    const weightedSum = todayData.reduce((s, d) => s + d.overall_score * d.media_volume, 0);
    const weightedAvg = totalVolume > 0 ? weightedSum / totalVolume : 0;

    // Score histogram
    const histogram = TIERS.map(({ min, max, key }) => ({
      key,
      min,
      max,
      count: todayData.filter((d) => d.overall_score >= min && d.overall_score < max).length,
      color: scoreToColor((min + max) / 2),
    }));
    // Last tier includes 10
    histogram[4].count = todayData.filter((d) => d.overall_score >= 8).length;
    const maxCount = Math.max(...histogram.map((h) => h.count), 1);

    // Party breakdown
    const partyMap = {};
    for (const d of todayData) {
      partyMap[d.party] = (partyMap[d.party] || 0) + 1;
    }
    const parties = Object.entries(partyMap)
      .map(([party, count]) => ({ party, count, color: getPartyColor(party) }))
      .sort((a, b) => b.count - a.count);

    return { total: todayData.length, weightedAvg, histogram, maxCount, parties };
  }, [todayData]);

  if (!stats) return null;

  return (
    <aside className="fixed top-0 inset-inline-start-0 w-[260px] h-screen bg-gray-950 border-e border-gray-800 overflow-y-auto z-30">
      <div className="p-5 space-y-6">
        {/* App Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
              PM
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">PolityMarket</h1>
          </div>
          <p className="text-xs text-gray-500">{t("app.header.subtitle")}</p>
        </div>

        {/* Total + Weighted Average */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 rounded-xl p-3">
            <div className="text-2xl font-black text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">{t("sidebar.totalTracked")}</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3">
            <div className="text-2xl font-black" style={{ color: scoreToColor(stats.weightedAvg) }}>
              {stats.weightedAvg.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">{t("sidebar.weightedAverage")}</div>
          </div>
        </div>

        {/* Score Histogram */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            {t("sidebar.histogram.title")}
          </h3>
          <div className="flex items-end gap-1.5 h-20">
            {stats.histogram.map((tier) => (
              <div key={tier.key} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: `${(tier.count / stats.maxCount) * 100}%`,
                    minHeight: tier.count > 0 ? 4 : 0,
                    backgroundColor: tier.color,
                    opacity: 0.8,
                  }}
                />
                <span className="text-[10px] text-gray-500">{tier.count}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-600">0</span>
            <span className="text-[9px] text-gray-600">5</span>
            <span className="text-[9px] text-gray-600">10</span>
          </div>
        </div>

        {/* Party Breakdown */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            {t("sidebar.partyBreakdown")}
          </h3>
          <div className="space-y-1.5">
            {stats.parties.map(({ party, count, color }) => (
              <div key={party} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: color.accent }}
                  />
                  <span className="text-gray-300">{localizeParty(t, party)}</span>
                </div>
                <span className="text-gray-500 font-mono">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Methodology Link */}
        <button
          onClick={onMethodologyClick}
          className="w-full text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 text-start transition-colors"
        >
          {t("methodology.link")}
        </button>
      </div>
    </aside>
  );
}
