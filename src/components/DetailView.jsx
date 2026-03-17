import { Loader2, Quote, BarChart3, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import AccordionSection from "./AccordionSection";
import { localizeName, localizeParty } from "../lib/localize";
import Avatar from "./Avatar";

function MetricBar({ label, value, max, color, weight }) {
  const pct = max !== 0 ? (Math.abs(value) / max) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>{label}</span>
          {weight && <span className="text-xs text-gray-600">({weight})</span>}
        </div>
        <span className="text-sm font-bold text-white">{value.toFixed(2)}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function DetailView({ todayDetail, selectedPolitician, selectedDate, loading }) {
  const { t } = useTranslation();

  if (!selectedPolitician) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500 text-sm text-center">
          {t("detailView.empty.selectPolitician")}
        </p>
      </div>
    );
  }

  if (loading || !todayDetail) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          <span className="text-sm text-gray-500">{t("detailView.loading")}</span>
        </div>
      </div>
    );
  }

  const entry = todayDetail.find(
    (d) => d.name === selectedPolitician || d.politician_id === selectedPolitician
  );
  if (!entry) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={entry.name} politicianId={entry.politician_id} size={48} />
          <div>
            <h4 className="text-lg font-bold text-white">{localizeName(t, entry.name)}</h4>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
              {localizeParty(t, entry.party)}
            </span>
          </div>
        </div>
        <div className="text-end">
          <div className="text-3xl font-bold text-white">{entry.overall_score.toFixed(1)}</div>
          <div className="text-xs text-gray-500">
            {selectedDate || t("detailView.date.fallback")}
          </div>
        </div>
      </div>

      {/* AI Analysis — expanded by default */}
      <AccordionSection title={t("detailView.section.aiAnalysis")} icon={Quote} defaultOpen={true}>
        {entry.chain_of_thought || entry.llm_reasoning ? (
          <p className="text-sm text-gray-300 italic leading-relaxed">
            &ldquo;{entry.chain_of_thought || entry.llm_reasoning}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-gray-500">{t("detailView.aiAnalysis.empty")}</p>
        )}
      </AccordionSection>

      {/* Score Breakdown — expanded by default */}
      <AccordionSection
        title={t("detailView.section.scoreBreakdown")}
        icon={BarChart3}
        defaultOpen={true}
      >
        <div className="space-y-3">
          <MetricBar
            label={t("detailView.metric.newsSentiment")}
            value={entry.news_sentiment}
            max={10}
            color="#6366f1"
            weight="40%"
          />
          <MetricBar
            label={t("detailView.metric.socialSentiment")}
            value={entry.social_sentiment}
            max={10}
            color="#8b5cf6"
            weight="35%"
          />
          <MetricBar
            label={t("detailView.metric.mediaVolume")}
            value={entry.media_volume}
            max={10}
            color="#a78bfa"
            weight="25%"
          />

          <div className="mt-2">
            <div className="flex h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500" style={{ width: "40%" }} />
              <div className="bg-violet-500" style={{ width: "35%" }} />
              <div className="bg-violet-300" style={{ width: "25%" }} />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{t("detailView.breakdown.policy")}</span>
              <span>{t("detailView.breakdown.hostility")}</span>
              <span>{t("detailView.breakdown.volume")}</span>
            </div>
          </div>

          {entry.hostility_level != null && (
            <div className="border-t border-gray-800 pt-3 mt-3 space-y-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider">
                {t("detailView.rubrics.heading")}
              </div>
              <MetricBar
                label={t("detailView.rubrics.hostility")}
                value={entry.hostility_level}
                max={1}
                color="#f43f5e"
              />
              <MetricBar
                label={t("detailView.rubrics.policyApproval")}
                value={entry.policy_approval}
                max={1}
                color="#22c55e"
              />
              <MetricBar
                label={t("detailView.rubrics.mediaAmplification")}
                value={entry.media_amplification}
                max={1}
                color="#f59e0b"
              />
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Sources — collapsed by default */}
      <AccordionSection title={t("detailView.section.sources")} icon={FileText} defaultOpen={false}>
        <p className="text-sm text-gray-500 italic">{t("detailView.sources.empty")}</p>
      </AccordionSection>
    </div>
  );
}
