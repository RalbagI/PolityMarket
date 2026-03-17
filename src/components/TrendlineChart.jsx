import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

export default function TrendlineChart({ data, dates, politicians, partyColors }) {
  const chartData = useMemo(() => {
    return dates.map((date) => {
      const row = { date };
      for (const name of politicians) {
        const entry = data.find((d) => d.date === date && d.name === name);
        if (entry) {
          row[name] = entry.overall_score;
        }
      }
      return row;
    });
  }, [data, dates, politicians]);

  const partyForPolitician = useMemo(() => {
    const map = {};
    for (const entry of data) {
      map[entry.name] = entry.party;
    }
    return map;
  }, [data]);

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-6">14-Day Trend</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              tickFormatter={(val) => format(parseISO(val), "MMM d")}
              stroke="#4b5563"
            />
            <YAxis domain={[0, 10]} tick={{ fill: "#9ca3af", fontSize: 12 }} stroke="#4b5563" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "12px",
                color: "#f3f4f6",
              }}
              labelFormatter={(val) => format(parseISO(val), "MMMM d, yyyy")}
            />
            <Legend wrapperStyle={{ fontSize: "13px", color: "#d1d5db" }} />
            {politicians.map((name) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={partyColors[partyForPolitician[name]] || "#8884d8"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
