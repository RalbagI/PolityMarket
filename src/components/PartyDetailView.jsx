import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, BarChart3, TrendingUp, Info } from "lucide-react";
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
import AccordionSection from "./AccordionSection";
import { scoreToColor } from "../lib/colorScale";
import { localizeName, localizeParty } from "../lib/localize";
import { getPartyColor } from "../lib/partyColors";
import { getPartyInfo } from "../lib/partyInfo";
import useStore from "../store";

function MemberRow({ entry, t }) {
  const displayName = localizeName(t, entry.name);
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
      <span className="text-sm text-gray-300 truncate">{displayName}</span>
      <span
        className="text-sm font-bold tabular-nums shrink-0 ms-2"
        style={{ color: scoreToColor(entry.overall_score) }}
      >
        {entry.overall_score.toFixed(1)}
      </span>
    </div>
  );
}

export default function PartyDetailView({ partyName, partyData, todayData }) {
  const { t } = useTranslation();
  const summaryData = useStore((s) => s.summaryData);

  const party = partyData;
  const members = useMemo(() => {
    if (!todayData?.length || !partyName) return [];
    return todayData
      .filter((p) => p.party === partyName)
      .sort((a, b) => b.media_volume - a.media_volume);
  }, [todayData, partyName]);

  // Historical party trend (last 7 days from summary data)
  const trend = useMemo(() => {
    if (!summaryData.length || !partyName) return [];

    // Pre-build O(1) lookup: Map<date, entry[]> for this party only
    const byDate = new Map();
    for (const d of summaryData) {
      if (d.party !== partyName) continue;
      if (!byDate.has(d.date)) byDate.set(d.date, []);
      byDate.get(d.date).push(d);
    }

    const dates = [...byDate.keys()].sort().slice(-7);
    return dates
      .map((date) => {
        const dayMembers = byDate.get(date);
        if (!dayMembers?.length) return null;
        const totalVol = dayMembers.reduce((s, m) => s + m.media_volume, 0);
        const avg =
          totalVol > 0
            ? dayMembers.reduce((s, m) => s + m.overall_score * m.media_volume, 0) / totalVol
            : dayMembers.reduce((s, m) => s + m.overall_score, 0) / dayMembers.length;
        return { date, score: parseFloat(avg.toFixed(1)), volume: parseFloat(totalVol.toFixed(1)) };
      })
      .filter(Boolean);
  }, [summaryData, partyName]);

  if (!partyName) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        {t("detailView.empty.selectPolitician")}
      </p>
    );
  }

  const partyColor = getPartyColor(partyName);
  const displayParty = localizeParty(t, partyName);
  const info = getPartyInfo(partyName);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: partyColor.bg, color: partyColor.text }}
        >
          {displayParty.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{displayParty}</h3>
          <p className="text-xs text-gray-500">
            {party?.member_count || members.length} {t("partyDetail.members")}
          </p>
        </div>
        {party && (
          <div className="ms-auto text-end shrink-0">
            <div
              className="text-2xl font-black tabular-nums"
              style={{ color: scoreToColor(party.overall_score) }}
            >
              {party.overall_score.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-500">{t("partyDetail.avgScore")}</div>
          </div>
        )}
      </div>

      {/* Party Info */}
      {info && (
        <AccordionSection title={t("partyDetail.info")} icon={Info} defaultOpen>
          <div className="space-y-3">
            {/* Description */}
            <p className="text-sm text-gray-300 leading-relaxed">
              {t(`partyDetail.descriptions.${partyName}`, info.description)}
            </p>

            {/* Quick facts */}
            <div className="bg-gray-800/50 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t("partyDetail.leader")}</span>
                <span className="text-gray-200 font-medium">{localizeName(t, info.leader)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t("partyDetail.status")}</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor:
                      info.status === "coalition"
                        ? "rgba(34,197,94,0.15)"
                        : info.status === "opposition"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(156,163,175,0.15)",
                    color:
                      info.status === "coalition"
                        ? "#4ade80"
                        : info.status === "opposition"
                          ? "#f87171"
                          : "#9ca3af",
                  }}
                >
                  {t(`partyDetail.statuses.${info.status}`, info.status)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t("partyDetail.ideology")}</span>
                <span className="text-gray-200 font-medium text-end ms-4">
                  {t(`partyDetail.ideologies.${info.ideology}`, info.ideology)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t("partyDetail.wing")}</span>
                <span className="text-gray-200 font-medium">
                  {t(`partyDetail.wings.${info.wing}`, info.wing)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t("partyDetail.seats")}</span>
                <span className="text-gray-200 font-medium">{info.seats}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{t("partyDetail.founded")}</span>
                <span className="text-gray-200 font-medium">{info.founded}</span>
              </div>
            </div>

            {/* Key Positions */}
            {info.keyPositions?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {t("partyDetail.keyPositions")}
                </h4>
                <ul className="space-y-1.5">
                  {info.keyPositions.map((pos, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: partyColor.accent }}
                      />
                      {t(`partyDetail.positions.${partyName}.${i}`, pos)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* Score Breakdown */}
      {party && (
        <AccordionSection
          title={t("detailView.section.scoreBreakdown")}
          icon={BarChart3}
          defaultOpen
        >
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t("detailView.breakdown.policy")}</span>
              <span className="text-indigo-400 font-medium">
                {party.policy_avg?.toFixed(2) ?? "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t("detailView.breakdown.hostility")}</span>
              <span className="text-violet-400 font-medium">
                {party.hostility_avg?.toFixed(2) ?? "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t("detailView.breakdown.volume")}</span>
              <span className="text-purple-400 font-medium">
                {party.amplification_avg?.toFixed(2) ?? "—"}
              </span>
            </div>
            {party.score_stddev != null && (
              <div className="flex justify-between text-sm border-t border-gray-700/50 pt-2">
                <span className="text-gray-400">{t("partyDetail.spread")}</span>
                <span className="text-gray-300 font-medium">±{party.score_stddev.toFixed(2)}</span>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* 7-Day Trend — Recharts chart matching politician trend style */}
      {trend.length > 1 && (
        <AccordionSection title={t("partyDetail.trend")} icon={TrendingUp} defaultOpen>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
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
                    name === "score"
                      ? t("trendlineChart.axis.score")
                      : t("trendlineChart.axis.volume"),
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
                  stroke={getPartyColor(partyName).bg || "#6366f1"}
                  strokeWidth={2}
                  dot={{ r: 3, fill: getPartyColor(partyName).bg || "#6366f1" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </AccordionSection>
      )}

      {/* Members List */}
      <AccordionSection title={t("partyDetail.members")} icon={Users} defaultOpen>
        {members.length > 0 ? (
          <div>
            {members.map((m) => (
              <MemberRow key={m.politician_id || m.name} entry={m} t={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">{t("detailView.sources.empty")}</p>
        )}
      </AccordionSection>
    </div>
  );
}
