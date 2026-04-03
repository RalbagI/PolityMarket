import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame, ChevronDown, Trophy, TrendingDown } from "lucide-react";
import useStore from "../store";
import { localizeName } from "../lib/localize";

/**
 * Compact floating weekly highlight for mobile — overlays the treemap.
 * Shows headline only; expands to show top 3 risers/fallers on tap.
 */
export default function WeeklyHighlightsMini({ onSelect }) {
  const { t } = useTranslation();
  const summaryData = useStore((s) => s.summaryData);
  const [expanded, setExpanded] = useState(false);

  const { headline, risers, fallers } = useMemo(() => {
    if (!summaryData.length) return { headline: null, risers: [], fallers: [] };

    const allDates = [...new Set(summaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];
    const weekIdx = Math.max(0, allDates.length - 7);
    const weekAgoDate = allDates[weekIdx];

    const todayEntries = summaryData.filter((d) => d.date === latest);
    const weekAgoEntries = summaryData.filter((d) => d.date === weekAgoDate);
    const weekAgoMap = new Map();
    for (const e of weekAgoEntries) weekAgoMap.set(e.name, e);

    const deltas = todayEntries
      .map((entry) => {
        const prev = weekAgoMap.get(entry.name);
        if (!prev) return null;
        const delta = entry.overall_score - prev.overall_score;
        return { ...entry, delta, prevScore: prev.overall_score };
      })
      .filter((d) => d && d.delta !== 0);

    const sorted = [...deltas].sort((a, b) => b.delta - a.delta);
    const byImpact = [...deltas].sort(
      (a, b) =>
        Math.abs(b.delta) * (1 + b.media_volume) -
        Math.abs(a.delta) * (1 + a.media_volume)
    );

    return {
      headline: byImpact[0] ?? null,
      risers: sorted.filter((d) => d.delta > 0).slice(0, 3),
      fallers: sorted
        .filter((d) => d.delta < 0)
        .slice(-3)
        .reverse(),
    };
  }, [summaryData]);

  if (!headline) return null;

  const isUp = headline.delta > 0;

  return (
    <div
      className={`rounded-xl backdrop-blur-md border shadow-lg transition-all duration-200 ${
        isUp
          ? "bg-gray-950/85 border-emerald-800/40"
          : "bg-gray-950/85 border-red-800/40"
      }`}
    >
      {/* Compact headline — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full px-3 py-2"
      >
        <Flame className={`w-3.5 h-3.5 shrink-0 ${isUp ? "text-emerald-400" : "text-red-400"}`} />
        <span className="text-xs font-bold text-white truncate">
          {localizeName(t, headline.name)}
        </span>
        <span
          className={`text-sm font-black tabular-nums shrink-0 ${
            isUp ? "text-emerald-400" : "text-red-400"
          }`}
          dir="ltr"
        >
          {isUp ? `+${headline.delta.toFixed(1)}` : headline.delta.toFixed(1)}
        </span>
        <span className="text-[9px] text-gray-500 shrink-0">
          {t("weeklyHighlights.weekInReview")}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-gray-500 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded: top 3 risers & fallers */}
      {expanded && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-2 border-t border-gray-800/50 pt-2">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Trophy className="w-2.5 h-2.5 text-emerald-500" />
              <span className="text-[9px] font-bold uppercase text-emerald-500/80">
                {t("weeklyHighlights.topRisers")}
              </span>
            </div>
            {risers.map((d) => (
              <button
                key={d.politician_id}
                onClick={() => onSelect(d.name)}
                className="flex items-center justify-between w-full py-0.5 hover:bg-gray-800/40 rounded px-1"
              >
                <span className="text-[10px] text-gray-300 truncate">
                  {localizeName(t, d.name)}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold tabular-nums shrink-0 ms-1" dir="ltr">
                  {`+${d.delta.toFixed(1)}`}
                </span>
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-2.5 h-2.5 text-red-500" />
              <span className="text-[9px] font-bold uppercase text-red-500/80">
                {t("weeklyHighlights.topFallers")}
              </span>
            </div>
            {fallers.map((d) => (
              <button
                key={d.politician_id}
                onClick={() => onSelect(d.name)}
                className="flex items-center justify-between w-full py-0.5 hover:bg-gray-800/40 rounded px-1"
              >
                <span className="text-[10px] text-gray-300 truncate">
                  {localizeName(t, d.name)}
                </span>
                <span className="text-[10px] text-red-400 font-bold tabular-nums shrink-0 ms-1" dir="ltr">
                  {d.delta.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
