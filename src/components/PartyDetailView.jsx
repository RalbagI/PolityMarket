import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import AccordionSection from "./AccordionSection";
import { scoreToColor } from "../lib/colorScale";
import { localizeName, localizeParty } from "../lib/localize";
import { getPartyColor } from "../lib/partyColors";
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
        return { date, score: parseFloat(avg.toFixed(1)) };
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

      {/* 7-Day Trend */}
      {trend.length > 1 && (
        <AccordionSection title={t("partyDetail.trend")} icon={TrendingUp} defaultOpen>
          <div className="flex items-end gap-1 h-16">
            {trend.map((day) => {
              const height = ((day.score - 3) / 4) * 100; // normalize 3-7 range to 0-100%
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(10, Math.min(100, height))}%`,
                      backgroundColor: scoreToColor(day.score),
                      opacity: 0.7,
                    }}
                  />
                  <span className="text-[8px] text-gray-600">{day.date.slice(8)}</span>
                </div>
              );
            })}
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
