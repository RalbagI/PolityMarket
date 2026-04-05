import { useState } from "react";
import { Quote, BarChart3, FileText, ChevronDown, TrendingUp, ExternalLink } from "lucide-react";
import AiAnalysisBlock from "./AiAnalysisBlock";
import { useTranslation } from "react-i18next";
import AccordionSection from "./AccordionSection";
import SkeletonLoader from "./SkeletonLoader";
import PoliticianTrendChart from "./PoliticianTrendChart";
import PoliticianDetailHeader from "./PoliticianDetailHeader";
import {
  hasConsensusSignal,
  isLowConfidenceSignal,
  resolveSignalConfidenceBand,
  SIGNAL_MODE_CONSENSUS_PROXY,
} from "../lib/signalMode";

const DIM_CONFIG = Object.freeze([
  { field: "dim_public_sentiment", key: "publicSentiment", color: "#6366f1", weight: "25%" },
  {
    field: "dim_parliamentary_activity",
    key: "parliamentaryActivity",
    color: "#8b5cf6",
    weight: "18%",
  },
  { field: "dim_media_credibility", key: "mediaCredibility", color: "#06b6d4", weight: "12%" },
  { field: "dim_transparency_ethics", key: "transparencyEthics", color: "#10b981", weight: "12%" },
  { field: "dim_field_activity", key: "fieldActivity", color: "#f59e0b", weight: "10%" },
  {
    field: "dim_satire_cultural_impact",
    key: "satireCulturalImpact",
    color: "#f43f5e",
    weight: "10%",
  },
  { field: "dim_legislative_quality", key: "legislativeQuality", color: "#a855f7", weight: "8%" },
  { field: "dim_flipflop_index", key: "flipflopIndex", color: "#14b8a6", weight: "5%" },
]);

/** Null-safe bar for 0–1 dimension scores. */
function DimensionBar({ label, value, color, weight, noDataLabel }) {
  const isNull = value == null || !Number.isFinite(value);
  const pct = isNull ? 0 : Math.min(value * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{label}</span>
          {weight && <span className="text-gray-600">({weight})</span>}
        </div>
        {isNull ? (
          <span className="text-xs text-gray-700 italic">{noDataLabel}</span>
        ) : (
          <span className="text-xs font-bold text-white">{value.toFixed(2)}</span>
        )}
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        {isNull ? (
          <div className="h-1.5 rounded-full bg-gray-700/20 w-full" />
        ) : (
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        )}
      </div>
    </div>
  );
}

/** Simple 0–1 sub-metric bar used inside the public-sentiment drill-down. */
function SubMetricBar({ label, value, max, color }) {
  const pct = max !== 0 ? (Math.abs(value) / max) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1">
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function extractSourceUrl(threadContext = []) {
  const sourceLine = threadContext.find((line) => /^source\s*:/i.test(line));
  if (!sourceLine) return null;
  const url = sourceLine.replace(/^source\s*:\s*/i, "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
}

export default function DetailView({
  todayDetail,
  selectedPolitician,
  selectedDate,
  loading,
  summaryData,
  signalMode,
  isLiked,
  onToggleLike,
  isAlertSubscribed,
  onToggleAlert,
}) {
  const { t } = useTranslation();
  const [sentimentOpen, setSentimentOpen] = useState(false);

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
    return <SkeletonLoader />;
  }

  const entry = todayDetail.find(
    (d) => d.name === selectedPolitician || d.politician_id === selectedPolitician
  );
  if (!entry) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500 text-sm text-center">{t("detailView.sources.empty")}</p>
      </div>
    );
  }

  const newsHeadlines = Array.isArray(entry.news_headlines) ? entry.news_headlines : [];
  const socialMentions = Array.isArray(entry.social_mentions) ? entry.social_mentions : [];
  const hasSources = newsHeadlines.length > 0 || socialMentions.length > 0;
  const confidenceBand = resolveSignalConfidenceBand(entry, SIGNAL_MODE_CONSENSUS_PROXY);
  const consensusScore = hasConsensusSignal(entry) ? entry.consensus_proxy : null;

  const nonNullDims = DIM_CONFIG.filter(
    ({ field }) => entry[field] != null && Number.isFinite(entry[field])
  ).length;
  const noDataLabel = t("detailView.dimension.noData");

  return (
    <div className="space-y-4">
      <PoliticianDetailHeader
        entry={entry}
        selectedDate={selectedDate}
        signalMode={signalMode}
        isLiked={isLiked}
        onToggleLike={onToggleLike}
        isAlertSubscribed={isAlertSubscribed}
        onToggleAlert={onToggleAlert}
      />

      {/* AI Analysis — expanded by default */}
      <AccordionSection title={t("detailView.section.aiAnalysis")} icon={Quote} defaultOpen={true}>
        <AiAnalysisBlock text={entry.chain_of_thought || entry.llm_reasoning} />
      </AccordionSection>

      {/* Unified 8-dimension breakdown — expanded by default */}
      <AccordionSection
        title={t("detailView.section.scoreBreakdown")}
        icon={BarChart3}
        defaultOpen={true}
      >
        {/* Data confidence badge */}
        <div className="flex justify-end mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
            {t("detailView.dimension.dataConfidence", {
              count: nonNullDims,
              total: DIM_CONFIG.length,
            })}
          </span>
        </div>

        <div className="space-y-3">
          {DIM_CONFIG.map(({ field, key, color, weight }) => {
            const value = entry[field] ?? null;

            if (field === "dim_public_sentiment") {
              return (
                <div key={field}>
                  <DimensionBar
                    label={t(`detailView.dimension.${key}`)}
                    value={value}
                    color={color}
                    weight={weight}
                    noDataLabel={noDataLabel}
                  />
                  {/* Expandable sub-metrics for public sentiment */}
                  <button
                    onClick={() => setSentimentOpen((o) => !o)}
                    className="flex items-center gap-1 mt-1 ms-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    aria-expanded={sentimentOpen}
                    aria-label={
                      sentimentOpen
                        ? t("detailView.dimension.hideSentimentDetail")
                        : t("detailView.dimension.showSentimentDetail")
                    }
                  >
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${sentimentOpen ? "rotate-180" : ""}`}
                    />
                    <span>{t("detailView.rubrics.heading")}</span>
                  </button>
                  {sentimentOpen &&
                    entry.hostility_level != null &&
                    entry.policy_approval != null &&
                    entry.media_amplification != null && (
                      <div className="mt-2 ms-3 space-y-2 border-s border-gray-700 ps-3">
                        <SubMetricBar
                          label={t("detailView.rubrics.hostility")}
                          value={entry.hostility_level}
                          max={1}
                          color="#f43f5e"
                        />
                        <SubMetricBar
                          label={t("detailView.rubrics.policyApproval")}
                          value={entry.policy_approval}
                          max={1}
                          color="#22c55e"
                        />
                        <SubMetricBar
                          label={t("detailView.rubrics.mediaAmplification")}
                          value={entry.media_amplification}
                          max={1}
                          color="#f59e0b"
                        />
                      </div>
                    )}
                </div>
              );
            }

            return (
              <DimensionBar
                key={field}
                label={t(`detailView.dimension.${key}`)}
                value={value}
                color={color}
                weight={weight}
                noDataLabel={noDataLabel}
              />
            );
          })}
        </div>
      </AccordionSection>

      {/* Trend over time */}
      <AccordionSection title={t("detailView.section.trend")} icon={TrendingUp} defaultOpen={true}>
        <PoliticianTrendChart
          politicianName={selectedPolitician}
          summaryData={summaryData}
          signalMode={signalMode}
        />
      </AccordionSection>

      <AccordionSection
        title={t("detailView.section.consensusProxy")}
        icon={TrendingUp}
        defaultOpen={true}
      >
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
          {Number.isFinite(consensusScore) ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">
                    {t("signals.consensusProxy")}
                  </div>
                  <div className="mt-1 text-3xl font-black text-white">
                    {Math.round(consensusScore)}
                  </div>
                  {confidenceBand && (
                    <div className="mt-1 text-xs text-gray-400">
                      {t("detailView.consensus.band", {
                        low: confidenceBand.low,
                        high: confidenceBand.high,
                      })}
                    </div>
                  )}
                </div>
                <div className="text-end">
                  <div className="text-xs text-gray-500">
                    {t(`signals.sources.${entry.consensus_signal_source || "media_only"}`)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {Number.isFinite(entry.consensus_confidence)
                      ? t("detailView.consensus.confidence", {
                          value: Math.round(entry.consensus_confidence * 100),
                        })
                      : t("detailView.consensus.confidenceUnknown")}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
                <div>
                  {t("detailView.consensus.coverage", {
                    count: entry.source_diversity ?? 0,
                    strength: Number.isFinite(entry.signal_strength)
                      ? Math.round(entry.signal_strength * 100)
                      : 0,
                  })}
                </div>
                <div>
                  {t("detailView.consensus.pollAnchor", {
                    source: t(`signals.sources.${entry.consensus_signal_source || "media_only"}`),
                  })}
                </div>
              </div>
              {isLowConfidenceSignal(entry, SIGNAL_MODE_CONSENSUS_PROXY) && (
                <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                  {t("detailView.consensus.lowConfidence")}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-gray-800 bg-gray-950/50 px-4 py-3 text-sm text-gray-400">
              {t("signals.consensusUnavailable")}
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Sources — expanded by default for drill-down discoverability */}
      <AccordionSection title={t("detailView.section.sources")} icon={FileText} defaultOpen={true}>
        {hasSources ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                {t("detailView.sources.news")}
              </div>
              {newsHeadlines.length ? (
                <ul className="space-y-2">
                  {newsHeadlines.map((headline) => (
                    <li key={headline} className="text-sm text-gray-300 leading-relaxed">
                      <span>• {headline}</span>
                      <a
                        href={`https://news.google.com/search?q=${encodeURIComponent(headline)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("detailView.sources.searchLink")}
                        className="inline-flex items-center gap-0.5 text-xs text-indigo-300 hover:text-indigo-200 ms-2 align-middle"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">{t("detailView.sources.empty")}</p>
              )}
            </div>

            <div className="border-t border-gray-800 pt-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                {t("detailView.sources.social")}
              </div>
              {socialMentions.length ? (
                <ul className="space-y-3">
                  {socialMentions.map((mention) => {
                    const sourceUrl = extractSourceUrl(mention.thread_context || []);
                    return (
                      <li key={mention.text} className="text-sm text-gray-300 leading-relaxed">
                        <p>• {mention.text}</p>
                        {sourceUrl && (
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-300 hover:text-indigo-200 underline mt-1 inline-block py-1"
                          >
                            {t("detailView.sources.sourceLink")}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic">{t("detailView.sources.empty")}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">{t("detailView.sources.empty")}</p>
        )}
      </AccordionSection>
    </div>
  );
}
