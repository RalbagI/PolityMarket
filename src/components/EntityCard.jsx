import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";
import { getPartyColor } from "../lib/partyColors";
import Avatar from "./Avatar";
import Sparkline from "./Sparkline";
import useStore from "../store";

export default function EntityCard({ entry, delta, isSelected, onSelect, sparklineData }) {
  const { t } = useTranslation();
  const colors = getPartyColor(entry.party);
  const isVolatile =
    useStore((s) => s.volatilityData?.politicians?.[entry.politician_id]?.is_volatile) === true;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={localizeName(t, entry.name)}
      onClick={() => onSelect(entry.name)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(entry.name);
        }
      }}
      className={`entity-card relative rounded-2xl p-5 cursor-pointer transition-all duration-200
        hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950
        ${isSelected ? "ring-2 ring-indigo-400 scale-[1.02]" : ""}
      `}
      style={{ backgroundColor: colors.bg }}
    >
      {/* Volatility indicator */}
      {isVolatile && (
        <span
          className="absolute top-3 end-3 flex h-3 w-3"
          title={t("alerts.volatile")}
          data-testid="volatility-indicator"
        >
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
        </span>
      )}

      {/* Top row: Avatar + Name */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar name={entry.name} politicianId={entry.politician_id} size={48} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold truncate" style={{ color: colors.text }}>
            {localizeName(t, entry.name)}
          </h3>
          <span className="text-xs font-medium opacity-80" style={{ color: colors.accent }}>
            {localizeParty(t, entry.party)}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-4xl font-black tabular-nums" style={{ color: colors.text }}>
            {entry.overall_score.toFixed(1)}
          </div>
          <div className="text-xs mt-1 opacity-60" style={{ color: colors.text }}>
            {t("leaderboard.column.score")}
          </div>
        </div>

        {/* Delta indicator */}
        {delta !== null && delta !== undefined && (
          <div
            className="flex items-center gap-1 text-sm font-bold"
            style={{ color: delta > 0 ? "#4ade80" : delta < 0 ? "#f87171" : colors.accent }}
          >
            {delta > 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : delta < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Volume bar */}
      <div className="mt-3">
        <div className="h-1 rounded-full opacity-30" style={{ backgroundColor: colors.text }} />
        <div
          className="h-1 rounded-full -mt-1 transition-all duration-500"
          style={{
            width: `${(entry.media_volume / 10) * 100}%`,
            backgroundColor: colors.accent,
          }}
        />
      </div>

      {/* Sparkline trend */}
      {sparklineData && sparklineData.length >= 2 && (
        <div className="mt-2">
          <Sparkline data={sparklineData} width={120} height={20} color={colors.accent} />
        </div>
      )}
    </div>
  );
}
