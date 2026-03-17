import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

// Neutral, non-party-affiliated line colors
const LINE_COLORS = ["#6366f1", "#f59e0b", "#06b6d4", "#f43f5e", "#8b5cf6"];

function computeSMA(values, window) {
  return values.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((v) => v != null);
    if (slice.length === 0) return null;
    return parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
  });
}

export default function TrendlineChart({ data, dates, politicians, onDateClick }) {
  const [smaMode, setSmaMode] = useState("sma7");

  const chartData = useMemo(() => {
    // Build raw data per date
    const raw = dates.map((date) => {
      const row = { date };
      let totalVolume = 0;
      for (const name of politicians) {
        const entry = data.find((d) => d.date === date && d.name === name);
        if (entry) {
          row[`${name}_raw`] = entry.overall_score;
          totalVolume += entry.media_volume;
        }
      }
      row.totalVolume = totalVolume;
      return row;
    });

    // Apply SMA if needed
    if (smaMode === "raw") {
      return raw.map((row) => {
        const out = { ...row };
        for (const name of politicians) {
          out[name] = out[`${name}_raw`];
        }
        return out;
      });
    }

    const window = smaMode === "sma7" ? 7 : 14;
    const result = raw.map((r) => ({ ...r }));

    for (const name of politicians) {
      const rawValues = raw.map((r) => r[`${name}_raw`]);
      const smoothed = computeSMA(rawValues, window);
      smoothed.forEach((val, i) => {
        result[i][name] = val;
      });
    }

    return result;
  }, [data, dates, politicians, smaMode]);

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h3 className="text-lg font-semibold text-white">Sentiment Trend</h3>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {[
            { key: "raw", label: "Raw" },
            { key: "sma7", label: "7d SMA" },
            { key: "sma14", label: "14d SMA" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSmaMode(key)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                smaMode === key ? "bg-gray-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]?.payload?.date && onDateClick) {
                onDateClick(e.activePayload[0].payload.date);
              }
            }}
            style={{ cursor: onDateClick ? "pointer" : "default" }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(val) => format(parseISO(val), "MMM d")}
              stroke="#4a5568"
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={[0, "auto"]}
              tick={{ fill: "#6b7280", fontSize: 11 }}
              stroke="#4a5568"
              label={{
                value: "Volume",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#6b7280", fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 10]}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              stroke="#4a5568"
              label={{
                value: "Score",
                angle: 90,
                position: "insideRight",
                style: { fill: "#9ca3af", fontSize: 11 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a202c",
                border: "1px solid #2d3748",
                borderRadius: "12px",
                color: "#e2e8f0",
              }}
              labelFormatter={(val) => format(parseISO(val), "MMMM d, yyyy")}
              formatter={(value, name) => {
                if (name === "totalVolume") return [value.toFixed(1), "Media Volume"];
                return [value?.toFixed(2), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px", color: "#cbd5e0" }} />

            {/* Volume bars on left axis */}
            <Bar
              yAxisId="left"
              dataKey="totalVolume"
              fill="#4a5568"
              opacity={0.3}
              name="Media Volume"
              barSize={12}
            />

            {/* Sentiment lines on right axis */}
            {politicians.map((name, i) => (
              <Line
                key={name}
                yAxisId="right"
                type="monotone"
                dataKey={name}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {smaMode !== "raw" && (
        <p className="text-xs text-gray-600 mt-2 text-right">
          Showing {smaMode === "sma7" ? "7" : "14"}-day simple moving average
        </p>
      )}
    </div>
  );
}
