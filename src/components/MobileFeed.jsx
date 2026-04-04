import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, ArrowLeftRight, ChevronDown } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";
import { scoreToColor, scoreToColorWithAlpha } from "../lib/colorScale";
import { resolveDisplayScore } from "../lib/marketScore";
import Avatar from "./Avatar";
import WeeklyHighlights from "./WeeklyHighlights";

function FeedCard({ entry, onSelect }) {
  const { t } = useTranslation();
  const scoreValue = Number.isFinite(entry.market_score)
    ? entry.market_score
    : (entry.overall_score ?? 0) * 10;
  const displayScore = Number.isFinite(entry.market_score)
    ? resolveDisplayScore(entry)
    : entry.overall_score.toFixed(1);
  const deltaValue = Number.isFinite(entry.market_delta_points)
    ? entry.market_delta_points
    : entry.delta;
  const color = scoreToColor(scoreValue);
  const deltaColor =
    deltaValue > 0 ? "text-emerald-400" : deltaValue < 0 ? "text-red-400" : "text-gray-500";
  const DeltaIcon = deltaValue > 0 ? TrendingUp : deltaValue < 0 ? TrendingDown : null;

  return (
    <button
      onClick={() => onSelect(entry.name)}
      className="flex items-center gap-3 w-full rounded-xl border border-white/10 bg-gray-900/60 p-3 hover:border-white/20 active:bg-gray-800/60 transition-colors"
    >
      <Avatar name={entry.name} politicianId={entry.politician_id} size={44} />
      <div className="flex-1 min-w-0 text-start">
        <div className="text-sm font-bold text-white truncate">
          {entry.displayName || localizeName(t, entry.name)}
        </div>
        <div className="text-[10px] text-gray-500">
          {entry.displayParty || localizeParty(t, entry.party)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {deltaValue != null && deltaValue !== 0 && (
          <div className={`flex items-center gap-0.5 ${deltaColor}`}>
            {DeltaIcon && <DeltaIcon className="w-3 h-3" />}
            <span className="text-xs font-bold tabular-nums" dir="ltr">
              {deltaValue > 0 ? `+${deltaValue.toFixed(1)}` : deltaValue.toFixed(1)}
            </span>
          </div>
        )}
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center font-bold text-base"
          style={{ backgroundColor: scoreToColorWithAlpha(scoreValue, 0.16), color }}
        >
          {displayScore}
        </div>
      </div>
    </button>
  );
}

export default function MobileFeed({ data, onSelect, onCompare }) {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = useState("score"); // "score" | "delta" | "volume"
  const [showAll, setShowAll] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...data];
    if (sortBy === "score") {
      arr.sort(
        (a, b) =>
          (Number.isFinite(b.market_score) ? b.market_score : (b.overall_score ?? 0) * 10) -
          (Number.isFinite(a.market_score) ? a.market_score : (a.overall_score ?? 0) * 10)
      );
    } else if (sortBy === "delta") {
      arr.sort(
        (a, b) =>
          Math.abs(
            (Number.isFinite(b.market_delta_points) ? b.market_delta_points : b.delta) || 0
          ) -
          Math.abs((Number.isFinite(a.market_delta_points) ? a.market_delta_points : a.delta) || 0)
      );
    } else if (sortBy === "volume") arr.sort((a, b) => b.media_volume - a.media_volume);
    return arr;
  }, [data, sortBy]);

  const visible = showAll ? sorted : sorted.slice(0, 15);

  return (
    <div className="px-3 pb-4 space-y-3">
      {/* Weekly highlights story card */}
      <WeeklyHighlights onSelect={onSelect} />

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCompare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs text-gray-300">{t("mobileFeed.compare")}</span>
        </button>

        {/* Sort pills */}
        <div className="flex items-center gap-1 ms-auto">
          {[
            { key: "score", label: t("mobileFeed.sort.score") },
            { key: "delta", label: t("mobileFeed.sort.delta") },
            { key: "volume", label: t("mobileFeed.sort.volume") },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
                sortBy === key ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed cards */}
      <div className="space-y-1.5">
        {visible.map((entry) => (
          <FeedCard key={entry.politician_id || entry.name} entry={entry} onSelect={onSelect} />
        ))}
      </div>

      {/* Show more */}
      {!showAll && sorted.length > 15 && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center justify-center gap-1 w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          {t("mobileFeed.showAll", { count: sorted.length - 15 })}
        </button>
      )}
    </div>
  );
}
