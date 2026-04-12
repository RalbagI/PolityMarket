import { useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Newspaper } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";
import { resolveSignalDisplayScore } from "../lib/signalMode";
import Sparkline from "./Sparkline";
import getSparklineData from "../lib/getSparklineData";
import useStore from "../store";

const getEntityKey = (entry, entityMode = "politician") =>
  entityMode === "party"
    ? entry?.party || entry?.name
    : entry?.politician_id || entry?.name || entry?.party;
const getEntityName = (entry, entityMode = "politician") =>
  entityMode === "party" ? entry?.party || entry?.name : entry?.name || entry?.party;

const INSIGHT_CONFIGS = [
  {
    type: "coverage",
    labelKey: "dailyInsights.mostWatched",
    Icon: Newspaper,
    gradient: "from-indigo-950/40 to-gray-950",
    border: "border-indigo-800/40",
    iconColor: "text-indigo-400",
    deltaColor: "text-indigo-300",
  },
  {
    type: "riser",
    labelKey: "dailyInsights.fastestRise",
    Icon: TrendingUp,
    gradient: "from-emerald-950/40 to-gray-950",
    border: "border-emerald-800/40",
    iconColor: "text-emerald-400",
    deltaColor: "text-emerald-400",
  },
  {
    type: "faller",
    labelKey: "dailyInsights.fastestDrop",
    Icon: TrendingDown,
    gradient: "from-red-950/40 to-gray-950",
    border: "border-red-800/40",
    iconColor: "text-red-400",
    deltaColor: "text-red-400",
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
  const { t, i18n } = useTranslation();
  const bottomLinesDoc = useStore((s) => s.bottomLines);
  const localeIsEnglish = i18n.language?.startsWith("en");

  const bottomLineLookup = useMemo(() => {
    const items = Array.isArray(bottomLinesDoc?.bottom_lines) ? bottomLinesDoc.bottom_lines : [];
    return new Map(items.map((item) => [item.politician_id, item]));
  }, [bottomLinesDoc]);

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

    const previous = allDates[allDates.length - 2];

    const previousByKey = new Map(
      summaryData
        .filter((e) => e.date === previous)
        .map((e) => [getEntityKey(e, entityMode), resolveSignalDisplayScore(e, signalMode)])
    );

    const todayEntries = data
      .map((entry) => {
        const entityKey = getEntityKey(entry, entityMode);
        const current = resolveSignalDisplayScore(entry, signalMode);
        const prev = previousByKey.get(entityKey);
        return {
          ...entry,
          signal_delta_points:
            Number.isFinite(current) && Number.isFinite(prev) ? current - prev : null,
          displayScore: Number.isFinite(current) ? current : null,
        };
      })
      .filter(Boolean);

    const interestOrVolume = (entry) => {
      const interest = Number(entry?.interest_score);
      return Number.isFinite(interest) ? interest : (entry?.media_volume ?? 0);
    };
    const sortedByDelta = todayEntries
      .filter((entry) => Number.isFinite(entry.signal_delta_points))
      .sort((a, b) => b.signal_delta_points - a.signal_delta_points);
    const sortedByInterest = [...todayEntries].sort(
      (a, b) => interestOrVolume(b) - interestOrVolume(a)
    );

    const usedKeys = new Set();
    const result = [];

    const pushInsight = (entry, type) => {
      if (!entry) return;
      usedKeys.add(getEntityKey(entry, entityMode));
      result.push({ ...entry, insightType: type });
    };

    // 1. Most watched — highest interest_score (falls back to media volume)
    pushInsight(
      sortedByInterest.find((d) => !usedKeys.has(getEntityKey(d, entityMode))),
      "coverage"
    );

    // 2. Fastest rise — biggest positive delta among the rest
    pushInsight(
      sortedByDelta.find(
        (d) => d.signal_delta_points > 0 && !usedKeys.has(getEntityKey(d, entityMode))
      ),
      "riser"
    );

    // 3. Fastest drop — biggest negative delta among the rest
    pushInsight(
      [...sortedByDelta]
        .reverse()
        .find((d) => d.signal_delta_points < 0 && !usedKeys.has(getEntityKey(d, entityMode))),
      "faller"
    );

    // Precompute sparkline data and locale-gated bottom line for each insight.
    return result.map((entry) => {
      const row = entityMode === "politician" ? bottomLineLookup.get(entry?.politician_id) : null;
      return {
        ...entry,
        _sparklineData: getSparklineData(summaryData, getEntityKey(entry, entityMode), signalMode),
        _bottomLine: row ? (localeIsEnglish ? row.bottom_line_en : row.bottom_line_he) : null,
      };
    });
  }, [data, signalMode, summaryData, bottomLineLookup, localeIsEnglish, entityMode]);

  const mobileScrollRef = useRef(null);
  const isRTL = i18n.dir() === "rtl";

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el || !insights.length) return;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left: isRTL ? el.scrollWidth : 0, behavior: "instant" });
    }
  }, [insights, isRTL]);

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
            key={getEntityKey(insight, entityMode)}
            insight={insight}
            config={INSIGHT_CONFIG_BY_TYPE[insight.insightType]}
            label={getEntityLabel(insight)}
            sparklineData={insight._sparklineData}
            bottomLine={insight._bottomLine}
            onSelect={() => onSelect(getEntityName(insight, entityMode))}
            t={t}
          />
        ))}
      </div>
      {/* Mobile: horizontal scroll */}
      <div
        ref={mobileScrollRef}
        className="flex md:hidden overflow-x-auto snap-x snap-mandatory gap-2 -mx-1 px-1 pb-1"
      >
        {insights.map((insight, i) => (
          <InsightCard
            key={getEntityKey(insight, entityMode)}
            insight={insight}
            config={INSIGHT_CONFIG_BY_TYPE[insight.insightType]}
            label={getEntityLabel(insight)}
            partyLabel={getEntityPartyLabel(insight)}
            sparklineData={insight._sparklineData}
            bottomLine={insight._bottomLine}
            onSelect={() => onSelect(getEntityName(insight, entityMode))}
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
  bottomLine,
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
        className={`text-start rounded-lg border p-2.5 bg-gradient-to-l ${gradient} ${border}
          hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20
          active:scale-[0.98] transition-all duration-200
          animate-fadeSlideUp min-w-[190px] snap-center shrink-0
        `}
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {t(labelKey)}
          </span>
        </div>
        <div className="text-base font-black text-white leading-tight truncate">{label}</div>
        {partyLabel && <div className="text-xs text-gray-500 mt-0.5 truncate">{partyLabel}</div>}
        {bottomLine && (
          <p className="mt-1.5 text-xs text-gray-300 leading-snug line-clamp-2">{bottomLine}</p>
        )}
        <div className="flex items-end justify-between mt-1.5 gap-2">
          <div>
            <div className={`text-xl font-black tabular-nums ${deltaColor}`} dir="ltr">
              {deltaDisplay}
            </div>
            {!isVolume && Number.isFinite(insight.displayScore) && (
              <div className="text-[10px] text-gray-600 mt-0.5" dir="ltr">
                → {Math.round(insight.displayScore)}
              </div>
            )}
          </div>
          <Sparkline data={sparklineData} width={48} height={18} />
        </div>
        <div className="text-[9px] text-gray-600 mt-1.5">{t("dailyInsights.tapToExplore")}</div>
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
      <div className="flex-1 min-w-0 text-start">
        <div className="text-sm font-bold text-white truncate">{label}</div>
        {bottomLine && (
          <div className="text-[10px] text-gray-400 truncate leading-tight">{bottomLine}</div>
        )}
      </div>
      <span className={`text-sm font-bold tabular-nums shrink-0 ${deltaColor}`} dir="ltr">
        {deltaDisplay}
      </span>
      <Sparkline data={sparklineData} width={40} height={14} />
    </button>
  );
}
