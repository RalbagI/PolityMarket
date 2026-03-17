import { useMemo } from "react";
import { useTranslation } from "react-i18next";

function getGaugeColor(score) {
  if (score <= 2) return "#dc2626";
  if (score <= 4) return "#f97316";
  if (score <= 6) return "#6b7280";
  if (score <= 8) return "#22c55e";
  return "#16a34a";
}

function getGaugeLabel(score, t) {
  if (score <= 2) return t("popularityGauge.label.veryNegative");
  if (score <= 4) return t("popularityGauge.label.negative");
  if (score <= 6) return t("popularityGauge.label.neutral");
  if (score <= 8) return t("popularityGauge.label.positive");
  return t("popularityGauge.label.veryPositive");
}

function GaugeArc({ score, t }) {
  const percentage = (score / 10) * 100;
  const color = getGaugeColor(score);
  const circumference = Math.PI * 110;
  const filled = (percentage / 100) * circumference;

  return (
    <svg viewBox="0 0 260 140" className="w-full max-w-[260px]">
      {/* Background arc */}
      <path
        d="M 20 130 A 110 110 0 0 1 240 130"
        fill="none"
        stroke="#374151"
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* Filled arc */}
      <path
        d="M 20 130 A 110 110 0 0 1 240 130"
        fill="none"
        stroke={color}
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        className="transition-all duration-700"
      />
      {/* Score text */}
      <text x="130" y="110" textAnchor="middle" fill="white" fontSize="36" fontWeight="bold">
        {score.toFixed(1)}
      </text>
      <text x="130" y="130" textAnchor="middle" fill="#9ca3af" fontSize="12">
        {getGaugeLabel(score, t)}
      </text>
    </svg>
  );
}

export default function PopularityGauge({ todayData, yesterdayData, summaryData }) {
  const { t } = useTranslation();
  const gauges = useMemo(() => {
    if (!todayData.length) return [];

    const allDates = [...new Set(summaryData.map((d) => d.date))].sort();
    const weekAgoIdx = Math.max(0, allDates.length - 7);
    const monthAgoIdx = Math.max(0, allDates.length - 30);
    const weekAgoDate = allDates[weekAgoIdx];
    const monthAgoDate = allDates[monthAgoIdx];

    const weekData = summaryData.filter((d) => d.date === weekAgoDate);
    const monthData = summaryData.filter((d) => d.date === monthAgoDate);

    return todayData.map((entry) => {
      const yesterday = yesterdayData.find((y) => y.name === entry.name);
      const lastWeek = weekData.find((w) => w.name === entry.name);
      const lastMonth = monthData.find((m) => m.name === entry.name);

      return {
        name: entry.name,
        party: entry.party,
        now: entry.overall_score,
        yesterday: yesterday?.overall_score ?? null,
        lastWeek: lastWeek?.overall_score ?? null,
        lastMonth: lastMonth?.overall_score ?? null,
      };
    });
  }, [todayData, yesterdayData, summaryData]);

  if (!gauges.length) return null;

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-6">{t("popularityGauge.title")}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {gauges.map((g) => (
          <div key={g.name} className="flex flex-col items-center">
            <GaugeArc score={g.now} t={t} />
            <div className="mt-2 text-center">
              <div className="text-sm font-semibold text-white truncate max-w-[140px]">
                {g.name.split(" ").pop()}
              </div>
              <div className="text-xs text-gray-500">{g.party}</div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-400">
              {g.yesterday !== null && (
                <>
                  <span>{t("popularityGauge.comparison.yesterday")}</span>
                  <span className="text-end font-medium text-gray-300">
                    {g.yesterday.toFixed(1)}
                  </span>
                </>
              )}
              {g.lastWeek !== null && (
                <>
                  <span>{t("popularityGauge.comparison.lastWeek")}</span>
                  <span className="text-end font-medium text-gray-300">
                    {g.lastWeek.toFixed(1)}
                  </span>
                </>
              )}
              {g.lastMonth !== null && (
                <>
                  <span>{t("popularityGauge.comparison.lastMonth")}</span>
                  <span className="text-end font-medium text-gray-300">
                    {g.lastMonth.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
