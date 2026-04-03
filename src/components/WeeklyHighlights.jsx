import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown, Trophy, Flame } from "lucide-react";
import useStore from "../store";
import { localizeName } from "../lib/localize";

/**
 * Weekly Highlights — story card + top 5 weekly movers.
 * Surfaces the most surprising changes to drive engagement.
 */
export default function WeeklyHighlights({ onSelect }) {
  const { t } = useTranslation();
  const summaryData = useStore((s) => s.summaryData);

  const { headline, risers, fallers, weekStart, weekEnd } = useMemo(() => {
    if (!summaryData.length)
      return { headline: null, risers: [], fallers: [], weekStart: null, weekEnd: null };

    const allDates = [...new Set(summaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];
    // Look back ~7 days (or as many as available)
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
        const pct =
          prev.overall_score > 0
            ? ((delta / prev.overall_score) * 100).toFixed(0)
            : delta > 0
              ? "+∞"
              : "0";
        return { ...entry, delta, pct, prevScore: prev.overall_score };
      })
      .filter((d) => d && d.delta !== 0);

    const sorted = [...deltas].sort((a, b) => b.delta - a.delta);
    const topRisers = sorted.filter((d) => d.delta > 0).slice(0, 5);
    const topFallers = sorted
      .filter((d) => d.delta < 0)
      .slice(-5)
      .reverse();

    // Pick headline: biggest delta weighted by media presence.
    // abs(delta) * (1 + media_volume) so high-profile politicians surface first.
    const byImpact = [...deltas].sort(
      (a, b) =>
        Math.abs(b.delta) * (1 + b.media_volume) -
        Math.abs(a.delta) * (1 + a.media_volume)
    );
    const biggest = byImpact[0] ?? null;

    return {
      headline: biggest,
      risers: topRisers,
      fallers: topFallers,
      weekStart: weekAgoDate,
      weekEnd: latest,
    };
  }, [summaryData]);

  if (!headline) return null;

  return (
    <div className="space-y-3">
      {/* Story headline */}
      {(() => {
        const isUp = headline.delta > 0;
        return (
          <button
            onClick={() => onSelect(headline.name)}
            className={`w-full text-start rounded-xl border p-4 hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 ${
              isUp
                ? "bg-gradient-to-l from-emerald-950/40 to-gray-950 border-emerald-800/40"
                : "bg-gradient-to-l from-red-950/40 to-gray-950 border-red-800/40"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-3">
              <Flame className={`w-4 h-4 ${isUp ? "text-emerald-400" : "text-red-400"}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                {t("weeklyHighlights.weekInReview")}
              </span>
            </div>

            <div className="text-lg font-black text-white leading-tight mb-2">
              {localizeName(t, headline.name)}
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span
                className={`text-2xl font-black tabular-nums ${
                  isUp ? "text-emerald-400" : "text-red-400"
                }`}
                dir="ltr"
              >
                {isUp ? `+${headline.delta.toFixed(1)}` : headline.delta.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500" dir="ltr">
                {headline.prevScore.toFixed(1)} → {headline.overall_score.toFixed(1)}
              </span>
            </div>

            <span className="text-[10px] text-gray-600 block" dir="ltr">
              {weekStart} → {weekEnd}
            </span>
          </button>
        );
      })()}

      {/* Top 5 risers */}
      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80">
            {t("weeklyHighlights.topRisers")}
          </span>
        </div>
        <div className="space-y-1">
          {risers.map((d, i) => (
            <button
              key={d.politician_id || d.name}
              onClick={() => onSelect(d.name)}
              className="flex items-center gap-2 w-full rounded-lg px-2 py-1 hover:bg-gray-800/60 transition-colors"
            >
              <span className="text-[10px] text-gray-600 w-3 shrink-0 tabular-nums">{i + 1}</span>
              <span className="text-xs text-gray-200 font-medium truncate flex-1 text-start">
                {localizeName(t, d.name)}
              </span>
              <span className="text-xs text-emerald-400 font-bold tabular-nums shrink-0" dir="ltr">
                {`+${d.delta.toFixed(1)}`}
              </span>
            </button>
          ))}
          {risers.length === 0 && (
            <p className="text-[10px] text-gray-600 text-center py-2">
              {t("weeklyHighlights.noMovers")}
            </p>
          )}
        </div>
      </div>

      {/* Top 5 fallers */}
      <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/80">
            {t("weeklyHighlights.topFallers")}
          </span>
        </div>
        <div className="space-y-1">
          {fallers.map((d, i) => (
            <button
              key={d.politician_id || d.name}
              onClick={() => onSelect(d.name)}
              className="flex items-center gap-2 w-full rounded-lg px-2 py-1 hover:bg-gray-800/60 transition-colors"
            >
              <span className="text-[10px] text-gray-600 w-3 shrink-0 tabular-nums">{i + 1}</span>
              <span className="text-xs text-gray-200 font-medium truncate flex-1 text-start">
                {localizeName(t, d.name)}
              </span>
              <span className="text-xs text-red-400 font-bold tabular-nums shrink-0" dir="ltr">
                {d.delta.toFixed(1)}
              </span>
            </button>
          ))}
          {fallers.length === 0 && (
            <p className="text-[10px] text-gray-600 text-center py-2">
              {t("weeklyHighlights.noMovers")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
