import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { localizeName } from "../lib/localize";

const VOICE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export default function ShareOfVoice({ todayData }) {
  const { t } = useTranslation();
  const shares = useMemo(() => {
    if (!todayData.length) return [];
    const totalVolume = todayData.reduce((sum, d) => sum + d.media_volume, 0);
    if (totalVolume === 0) return [];

    return todayData
      .map((d) => ({
        name: d.name.split(" ").pop(),
        fullName: d.name,
        party: d.party,
        volume: d.media_volume,
        percentage: (d.media_volume / totalVolume) * 100,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [todayData]);

  if (!shares.length) return null;

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{t("shareOfVoice.title")}</h3>
      <p className="text-xs text-gray-500 mb-4">{t("shareOfVoice.description")}</p>

      {/* Stacked bar */}
      <div className="flex h-6 rounded-full overflow-hidden mb-4">
        {shares.map((s, i) => (
          <div
            key={s.fullName}
            className="transition-all duration-500"
            style={{
              width: `${s.percentage}%`,
              backgroundColor: VOICE_COLORS[i % VOICE_COLORS.length],
            }}
            title={`${localizeName(t, s.fullName)}: ${s.percentage.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {shares.map((s, i) => (
          <div key={s.fullName} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: VOICE_COLORS[i % VOICE_COLORS.length] }}
              />
              <span className="text-gray-300">{localizeName(t, s.fullName)}</span>
            </div>
            <span className="text-gray-400 font-medium">{s.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
