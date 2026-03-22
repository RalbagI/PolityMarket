import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useStore from "../store";
import computeSMA from "../lib/sma";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export default memo(function PoliticianTrendChart({ politicianName }) {
  const { t } = useTranslation();
  const summaryData = useStore((s) => s.summaryData);
  const smaMode = useStore((s) => s.smaMode);
  const setSmaMode = useStore((s) => s.setSmaMode);

  const chartData = useMemo(() => {
    if (!summaryData.length || !politicianName) return [];

    // Build O(1) lookup by date for the selected politician
    const byDate = new Map();
    for (const d of summaryData) {
      if (d.name === politicianName) byDate.set(d.date, d);
    }
    if (!byDate.size) return [];

    const dates = [...new Set(summaryData.map((d) => d.date))].sort();

    const rawScores = dates.map((date) => {
      const entry = byDate.get(date);
      return entry ? entry.overall_score : null;
    });

    const rawVolumes = dates.map((date) => {
      const entry = byDate.get(date);
      return entry ? entry.media_volume : 0;
    });

    let scores = rawScores;
    if (smaMode === "sma7") scores = computeSMA(rawScores, 7);
    else if (smaMode === "sma14") scores = computeSMA(rawScores, 14);

    return dates.map((date, i) => ({
      date,
      score: scores[i],
      volume: rawVolumes[i],
    }));
  }, [summaryData, politicianName, smaMode]);

  if (!chartData.length) {
    return (
      <p className="text-xs text-gray-500 text-center py-4">{t("detailView.sources.empty")}</p>
    );
  }

  return (
    <div>
      {/* SMA toggle */}
      <div className="flex items-center justify-end gap-1 mb-2">
        {[
          { key: "raw", label: t("trendlineChart.sma.raw") },
          { key: "sma7", label: t("trendlineChart.sma.7d") },
          { key: "sma14", label: t("trendlineChart.sma.14d") },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSmaMode(key)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              smaMode === key ? "bg-gray-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickFormatter={(d) => format(parseISO(d), "d/M")}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              domain={[0, "auto"]}
              width={30}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: "#6b7280" }}
              domain={[0, 10]}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(d) => format(parseISO(d), "d MMMM yyyy")}
              formatter={(value, name) => [
                typeof value === "number" ? value.toFixed(1) : value,
                name === "score" ? t("trendlineChart.axis.score") : t("trendlineChart.axis.volume"),
              ]}
            />
            <Bar
              yAxisId="left"
              dataKey="volume"
              fill="rgba(107,114,128,0.2)"
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#6366f1" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
