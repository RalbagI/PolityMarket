import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Newspaper } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";
import { resolveSignalDisplayScore } from "../lib/signalMode";
import Sparkline from "./Sparkline";
import getSparklineData from "../lib/getSparklineData";

const getEntityKey = (entry) => entry?.politician_id || entry?.name || entry?.party;
const getEntityName = (entry) => entry?.name || entry?.party;

const INSIGHT_CONFIGS = [
  {
    type: "riser",
    labelKey: "dailyInsights.biggestRiser",
    Icon: TrendingUp,
    gradient: "from-emerald-950/40 to-gray-950",
    border: "border-emerald-800/40",
    iconColor: "text-emerald-400",
    deltaColor: "text-emerald-400",
  },
  {
    type: "faller",
    labelKey: "dailyInsights.biggestFaller",
    Icon: TrendingDown,
    gradient: "from-red-950/40 to-gray-950",
    border: "border-red-800/40",
    iconColor: "text-red-400",
    deltaColor: "text-red-400",
  },
  {
    type: "coverage",
    labelKey: "dailyInsights.mostCovered",
    Icon: Newspaper,
    gradient: "from-indigo-950/40 to-gray-950",
    border: "border-indigo-800/40",
    iconColor: "text-indigo-400",
    deltaColor: "text-indigo-300",
  },
];

const INSIGHT_CONFIG_BY_TYPE = Object.fromEntries(
  INSIGHT_CONFIGS.map((config) => [config.type, config])
);

export default function DailyInsights({
  data,
  summaryData = [],
  signalMode = "media_climate",
  onSelect,
  entityMode = "politician",
}) {
  const { t } = useTranslation();

  const getEntityLabel = (entry) =>
    entry?.displayName ||
    (entityMode === "party"
      ? localizeParty(t, entry?.party || entry?.name)
      : localizeName(t, entry?.name));

  const getEntityPartyLabel = (entry) =>
    entityMode === "party" ? null : localizeParty(t, entry?.party);

  const insights = useMemo(() => {
    if (!data?.length || !summaryData?.length) return [];

    const allDates = [...new Set(summaryData.map((e) => e.date))].sort();
    if (allDates.length < 2) return [];

    const latest = allDates[allDates.length - 1];
    const previous = allDates[allDates.length - 2];

    const todayRows = summaryData.filter((e) => e.date === latest);
    const previousByKey = new Map(
      summaryData
        .filter((e) => e.date === previous)
        .map((e) => [getEntityKey(e), resolveSignalDisplayScore(e, signalMode)])
    );

    const todayEntries = todayRows
      .map((entry) => {
        const entityKey = getEntityKey(entry);
        const current = resolveSignalDisplayScore(entry, signalMode);
        const prev = previousByKey.get(entityKey);
        // Merge with enriched data (displayName, etc.) if available
        const enriched = data.find((d) => getEntityKey(d) === entityKey) ?? entry;
        return {
          ...enriched,
          signal_delta_points:
            Number.isFinite(current) && Number.isFinite(prev) ? current - prev : null,
          displayScore: Number.isFinite(current) ? current : null,
        };
      })
      .filter(Boolean);

    const sortedByDelta = todayEntries
      .filter((entry) => Number.isFinite(entry.signal_delta_points))
      .sort((a, b) => b.signal_delta_points - a.signal_delta_points);
    const sortedByVolume = [...todayEntries].sort(
      (a, b) => (b.media_volume ?? 0) - (a.media_volume ?? 0)
    );

    const usedKeys = new Set();
    const result = [];

    const pushInsight = (entry, type) => {
      if (!entry) return;
      usedKeys.add(getEntityKey(entry));
      result.push({ ...entry, insightType: type });
    };

    // 1. Biggest riser
    pushInsight(
      sortedByDelta.find((d) => d.signal_delta_points > 0 && !usedKeys.has(getEntityKey(d))),
      "riser"
    );

    // 2. Biggest faller
    pushInsight(
      [...sortedByDelta]
        .reverse()
        .find((d) => d.signal_delta_points < 0 && !usedKeys.has(getEntityKey(d))),
      "faller"
    );

    // 3. Most covered (by media_volume)
    pushInsight(
      sortedByVolume.find((d) => !usedKeys.has(getEntityKey(d))),
      "coverage"
    );

    // Precompute sparkline data for each insight
    return result.map((entry) => ({
      ...entry,
      _sparklineData: getSparklineData(summaryData, getEntityKey(entry), signalMode),
    }));
  }, [data, signalMode, summaryData]);

  if (!insights.length) {
    return (
      <div
        className="shrink-0 flex items-center justify-center px-3 py-2 text-xs text-gray-600"
        role="region"
        aria-label={t("dailyInsights.ariaLabel")}
      >
        {t("dailyInsights.noData")}
      </div>
    );
  }

  return (
    <div
      className="shrink-0 px-3 py-1.5 bg-gray-950 border-b border-gray-800/50"
      role="region"
      aria-label={t("dailyInsights.ariaLabel")}
    >
      <div className="hidden md:flex md:flex-col gap-0.5">
        {insights.map((insight) => (
          <InsightCard
            key={getEntityKey(insight)}
            insight={insight}
            config={INSIGHT_CONFIG_BY_TYPE[insight.insightType]}
            label={getEntityLabel(insight)}
            sparklineData={insight._sparklineData}
            onSelect={() => onSelect(getEntityName(insight))}
            t={t}
          />
        ))}
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory gap-3 -mx-1 px-1 pb-1">
        {insights.map((insight, i) => (
          <InsightCard
            key={getEntityKey(insight)}
            insight={insight}
            config={INSIGHT_CONFIG_BY_TYPE[insight.insightType]}
            label={getEntityLabel(insight)}
            partyLabel={getEntityPartyLabel(insight)}
            sparklineData={insight._sparklineData}
            onSelect={() => onSelect(getEntityName(insight))}
            t={t}
            animationDelay={i * 100}
            mobile
          />
        ))}
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  config,
  label,
  partyLabel,
  sparklineData,
  onSelect,
  t,
  animationDelay,
  mobile,
}) {
  const { Icon, labelKey, gradient, border, iconColor, deltaColor } = config;
  const isVolume = config.type === "coverage";
  const deltaValue = insight.signal_delta_points;

  const deltaDisplay = isVolume
    ? (insight.media_volume ?? 0).toFixed(1)
    : `${deltaValue > 0 ? "+" : ""}${deltaValue.toFixed(1)}`;

  /* ── Mobile: full card layout ── */
  if (mobile) {
    return (
      <button
        onClick={onSelect}
        className={`text-start rounded-xl border p-3 bg-gradient-to-l ${gradient} ${border}
          hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
          active:scale-[0.98] transition-all duration-200
          animate-fadeSlideUp min-w-[240px] snap-center shrink-0
        `}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {t(labelKey)}
          </span>
        </div>
        <div className="text-lg font-black text-white leading-tight truncate">{label}</div>
        {partyLabel && <div className="text-xs text-gray-500 mt-0.5 truncate">{partyLabel}</div>}
        <div className="flex items-end justify-between mt-2 gap-2">
          <div>
            <div className={`text-2xl font-black tabular-nums ${deltaColor}`} dir="ltr">
              {deltaDisplay}
            </div>
            {!isVolume && Number.isFinite(insight.displayScore) && (
              <div className="text-[10px] text-gray-600 mt-0.5" dir="ltr">
                → {Math.round(insight.displayScore)}
              </div>
            )}
          </div>
          <Sparkline data={sparklineData} width={60} height={24} />
        </div>
        <div className="text-[9px] text-gray-600 mt-2">{t("dailyInsights.tapToExplore")}</div>
      </button>
    );
  }

  /* ── Desktop: compact horizontal row ── */
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 w-full rounded-lg border px-2 py-1 bg-gradient-to-l ${gradient} ${border}
        hover:bg-gray-800/40 transition-colors`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500 shrink-0 w-24 truncate text-start">
        {t(labelKey)}
      </span>
      <span className="text-sm font-bold text-white truncate flex-1 min-w-0 text-start">
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums shrink-0 ${deltaColor}`} dir="ltr">
        {deltaDisplay}
      </span>
      <Sparkline data={sparklineData} width={40} height={14} />
    </button>
  );
}
