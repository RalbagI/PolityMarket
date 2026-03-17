import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";

function ScoreBadge({ score }) {
  let bg, text;
  if (score < 4) {
    bg = "bg-red-500/20";
    text = "text-red-400";
  } else if (score <= 6) {
    bg = "bg-gray-500/20";
    text = "text-gray-300";
  } else {
    bg = "bg-emerald-500/20";
    text = "text-emerald-400";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-bold ${bg} ${text}`}
    >
      {score.toFixed(1)}
    </span>
  );
}

function DeltaIndicator({ delta }) {
  if (delta === null || delta === undefined) {
    return <span className="text-gray-500 text-sm">—</span>;
  }

  if (Math.abs(delta) < 0.05) {
    return (
      <span className="flex items-center gap-1 text-gray-500 text-sm">
        <Minus className="w-3 h-3" /> 0.0
      </span>
    );
  }

  const isPositive = delta > 0;
  return (
    <span
      className={`flex items-center gap-1 text-sm font-semibold ${
        isPositive ? "text-emerald-400" : "text-red-400"
      }`}
    >
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {isPositive ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

function SortHeader({ label, field, sortKey, sortDir, onSort }) {
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
    >
      {label}
      {sortKey === field &&
        (sortDir === "desc" ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        ))}
    </button>
  );
}

export default function Leaderboard({
  todayData,
  yesterdayData,
  partyColors,
  selectedPolitician,
  onSelect,
}) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState("overall_score");
  const [sortDir, setSortDir] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...todayData].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    return mul * (a[sortKey] - b[sortKey]);
  });

  const getDelta = (name) => {
    const prev = yesterdayData.find((y) => y.name === name);
    const curr = todayData.find((t) => t.name === name);
    if (!prev || !curr) return null;
    return curr.overall_score - prev.overall_score;
  };

  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">{t("leaderboard.title")}</h3>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-6 py-3 text-start">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("leaderboard.column.rank")}
                </span>
              </th>
              <th className="px-6 py-3 text-start">
                <SortHeader
                  label={t("leaderboard.column.politician")}
                  field="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="px-6 py-3 text-start">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("leaderboard.column.party")}
                </span>
              </th>
              <th className="px-6 py-3 text-end">
                <SortHeader
                  label={t("leaderboard.column.score")}
                  field="overall_score"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
              </th>
              <th className="px-6 py-3 text-end">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {t("leaderboard.column.change")}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, i) => {
              const isSelected = selectedPolitician === entry.name;
              return (
                <tr
                  key={entry.politician_id || entry.name}
                  onClick={() => onSelect(isSelected ? null : entry.name)}
                  className={`border-b border-gray-800/50 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-500/10 hover:bg-blue-500/15" : "hover:bg-gray-800/50"
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{i + 1}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white">
                      {localizeName(t, entry.name)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${partyColors[entry.party]}20`,
                        color: partyColors[entry.party],
                      }}
                    >
                      {localizeParty(t, entry.party)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-end">
                    <ScoreBadge score={entry.overall_score} />
                  </td>
                  <td className="px-6 py-4 text-end">
                    <DeltaIndicator delta={getDelta(entry.name)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden divide-y divide-gray-800/50">
        {sorted.map((entry, i) => {
          const isSelected = selectedPolitician === entry.name;
          return (
            <div
              key={entry.politician_id || entry.name}
              onClick={() => onSelect(isSelected ? null : entry.name)}
              className={`px-4 py-4 cursor-pointer transition-colors ${
                isSelected ? "bg-blue-500/10" : "hover:bg-gray-800/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-mono w-5">{i + 1}</span>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {localizeName(t, entry.name)}
                    </div>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${partyColors[entry.party]}20`,
                        color: partyColors[entry.party],
                      }}
                    >
                      {localizeParty(t, entry.party)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={entry.overall_score} />
                  <DeltaIndicator delta={getDelta(entry.name)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
