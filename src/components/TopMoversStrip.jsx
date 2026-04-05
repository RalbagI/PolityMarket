import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";
import { resolveSignalDisplayScore } from "../lib/signalMode";
import Sparkline from "./Sparkline";
import getSparklineData from "../lib/getSparklineData";

const getEntityKey = (entry) => entry?.politician_id || entry?.name || entry?.party;
const getEntityName = (entry) => entry?.name || entry?.party;

export default function TopMoversStrip({
  data,
  onSelect,
  summaryData = [],
  signalMode = "media_climate",
  entityMode = "politician",
}) {
  const { t } = useTranslation();
  const getEntityLabel = (entry) =>
    entry?.displayName ||
    (entityMode === "party"
      ? localizeParty(t, entry?.party || entry?.name)
      : localizeName(t, entry?.name));

  const { risers, fallers } = useMemo(() => {
    if (!data || !data.length) return { risers: [], fallers: [] };

    const allDates = [...new Set(summaryData.map((entry) => entry.date))].sort();
    if (allDates.length >= 2) {
      const latest = allDates[allDates.length - 1];
      const previous = allDates[allDates.length - 2];
      const todayRows = summaryData.filter((entry) => entry.date === latest);
      const previousByName = new Map(
        summaryData
          .filter((entry) => entry.date === previous)
          .map((entry) => [getEntityKey(entry), resolveSignalDisplayScore(entry, signalMode)])
      );
      const withDelta = todayRows
        .map((entry) => {
          const current = resolveSignalDisplayScore(entry, signalMode);
          const previousScore = previousByName.get(getEntityKey(entry));
          if (!Number.isFinite(current) || !Number.isFinite(previousScore)) return null;
          const delta = current - previousScore;
          if (delta === 0) return null;
          const todayEntry =
            data.find((candidate) => getEntityKey(candidate) === getEntityKey(entry)) ?? entry;
          return {
            ...todayEntry,
            signal_delta_points: delta,
          };
        })
        .filter(Boolean);

      const sorted = [...withDelta].sort((a, b) => b.signal_delta_points - a.signal_delta_points);

      const addSparklines = (items) =>
        items.map((d) => ({
          ...d,
          _sparklineData: getSparklineData(summaryData, getEntityKey(d), signalMode),
        }));
      return {
        risers: addSparklines(sorted.filter((d) => d.signal_delta_points > 0).slice(0, 3)),
        fallers: addSparklines(
          sorted
            .filter((d) => d.signal_delta_points < 0)
            .slice(-3)
            .reverse()
        ),
      };
    }

    const withDelta = data
      .filter((d) => d.market_delta_points != null && d.market_delta_points !== 0)
      .map((entry) => ({ ...entry, signal_delta_points: entry.market_delta_points }));
    const sorted = [...withDelta].sort((a, b) => b.signal_delta_points - a.signal_delta_points);

    const addSparklines = (items) =>
      items.map((d) => ({
        ...d,
        _sparklineData: getSparklineData(summaryData, getEntityKey(d), signalMode),
      }));
    return {
      risers: addSparklines(sorted.filter((d) => d.signal_delta_points > 0).slice(0, 3)),
      fallers: addSparklines(
        sorted
          .filter((d) => d.signal_delta_points < 0)
          .slice(-3)
          .reverse()
      ),
    };
  }, [data, signalMode, summaryData]);

  if (!risers.length && !fallers.length) {
    return (
      <div
        className="flex items-center justify-center min-h-[40px] text-xs text-gray-600"
        role="region"
        aria-label={t("topMovers.ariaLabel")}
      >
        {t("topMovers.noChanges")}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-3 min-h-[40px] overflow-x-auto"
      role="region"
      aria-label={t("topMovers.ariaLabel")}
    >
      {/* Risers */}
      {risers.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[10px] text-emerald-500/70 font-medium uppercase tracking-wider shrink-0">
            {t("topMovers.risers")}
          </span>
          {risers.map((d, i) => (
            <button
              key={d.politician_id || d.name}
              onClick={() => onSelect(getEntityName(d))}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors shrink-0 animate-scaleIn"
              style={{ animationDelay: `${i * 50}ms` }}
              aria-label={`${getEntityLabel(d)}: +${d.signal_delta_points.toFixed(1)}`}
            >
              <span className="text-xs text-gray-200 font-medium truncate max-w-[80px]">
                {getEntityLabel(d)}
              </span>
              <Sparkline data={d._sparklineData} width={36} height={14} color="#34d399" />
              <span className="text-xs text-emerald-400 font-bold tabular-nums" dir="ltr">
                +{d.signal_delta_points.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Divider */}
      {risers.length > 0 && fallers.length > 0 && <div className="w-px h-5 bg-gray-700 shrink-0" />}

      {/* Fallers */}
      {fallers.length > 0 && (
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendingDown className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="text-[10px] text-red-500/70 font-medium uppercase tracking-wider shrink-0">
            {t("topMovers.fallers")}
          </span>
          {fallers.map((d, i) => (
            <button
              key={d.politician_id || d.name}
              onClick={() => onSelect(getEntityName(d))}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors shrink-0 animate-scaleIn"
              style={{ animationDelay: `${(risers.length + i) * 50}ms` }}
              aria-label={`${getEntityLabel(d)}: ${d.signal_delta_points.toFixed(1)}`}
            >
              <span className="text-xs text-gray-200 font-medium truncate max-w-[80px]">
                {getEntityLabel(d)}
              </span>
              <Sparkline data={d._sparklineData} width={36} height={14} color="#fb7185" />
              <span className="text-xs text-red-400 font-bold tabular-nums" dir="ltr">
                {d.signal_delta_points.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
