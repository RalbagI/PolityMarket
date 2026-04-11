import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import useStore from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar, { SidebarContent } from "./components/Sidebar";
import useSidebarStats from "./lib/useSidebarStats";
import Treemap from "./components/Treemap";
import TopMoversStrip from "./components/TopMoversStrip";
import DailyInsights from "./components/DailyInsights";
import WeeklyHighlights from "./components/WeeklyHighlights";
import MethodologyModal from "./components/MethodologyModal";
import useFilterState from "./lib/useFilterState";
import normalizeScores from "./lib/normalizeScores";
import getSparklineData from "./lib/getSparklineData";
import { computeInterestScores } from "./utils/interestScore";
import { rescoreEntries } from "./utils/rescoring";
import useUserWeights from "./hooks/useUserWeights";
import WeightsSideSheet from "./components/WeightsSideSheet";
import { localizeName } from "./lib/localize";
import CookieConsent from "./components/CookieConsent";
import { initAnalytics, logEvent } from "./lib/analytics";
import useAlertState from "./lib/useAlertState";
import {
  derivePartyTimelineFromSummary,
  getStoredOrAnnotatedMarketTimeline,
} from "./lib/marketArtifacts";
import {
  hasConsensusInRows,
  SIGNAL_MODE_CONSENSUS_PROXY,
  SIGNAL_MODE_MEDIA_CLIMATE,
} from "./lib/signalMode";

const SlidePanel = lazy(() => import("./components/SlidePanel"));
const DetailView = lazy(() => import("./components/DetailView"));
const PartyDetailView = lazy(() => import("./components/PartyDetailView"));
const CompareView = lazy(() => import("./components/CompareView"));
const AlertSubscriptionModal = lazy(() => import("./components/AlertSubscriptionModal"));

export default function App() {
  const { t } = useTranslation();
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [viewMode, setViewMode] = useState("politicians"); // "politicians" | "parties"
  const summaryData = useStore((s) => s.summaryData);
  const partySummaryData = useStore((s) => s.partySummaryData);
  const loadError = useStore((s) => s.loadError);
  const loadSummary = useStore((s) => s.loadSummary);
  const loadPartySummary = useStore((s) => s.loadPartySummary);
  const loadVolatility = useStore((s) => s.loadVolatility);
  const volatilityData = useStore((s) => s.volatilityData);
  const loadBottomLines = useStore((s) => s.loadBottomLines);
  const treemapLens = useStore((s) => s.treemapLens);
  const setTreemapLens = useStore((s) => s.setTreemapLens);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const userWeightsApi = useUserWeights();
  const panelOpen = useStore((s) => s.panelOpen);
  const selectedPolitician = useStore((s) => s.selectedPolitician);
  const selectedDate = useStore((s) => s.selectedDate);
  const selectedDetailKey = useStore((s) => s.selectedDetailKey);
  const detailLoading = useStore((s) => s.detailLoading);
  const signalMode = useStore((s) => s.signalMode);
  const setSignalMode = useStore((s) => s.setSignalMode);
  const openPanel = useStore((s) => s.openPanel);
  const closePanel = useStore((s) => s.closePanel);

  // Lock scroll on the outer container when panel is open (mobile)
  const scrollContainerRef = useRef(null);
  const savedScrollTop = useRef(0);
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    if (panelOpen) {
      savedScrollTop.current = el.scrollTop;
      el.style.overflow = "hidden";
    } else {
      el.style.overflow = "";
      el.scrollTop = savedScrollTop.current;
    }
  }, [panelOpen]);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    loadSummary();
    loadVolatility();
    loadBottomLines();
  }, [loadSummary, loadVolatility, loadBottomLines]);

  const marketSummaryData = useMemo(() => {
    return getStoredOrAnnotatedMarketTimeline(summaryData, "politician_id");
  }, [summaryData]);

  const { todayData, latestDate } = useMemo(() => {
    if (!marketSummaryData.length) return { todayData: [], latestDate: null };

    const allDates = [...new Set(marketSummaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];

    return {
      todayData: marketSummaryData.filter((d) => d.date === latest),
      latestDate: latest,
    };
  }, [marketSummaryData]);

  const consensusAvailable = useMemo(() => {
    if (!latestDate) return false;
    return hasConsensusInRows(marketSummaryData, latestDate);
  }, [latestDate, marketSummaryData]);

  useEffect(() => {
    if (viewMode === "parties") {
      loadPartySummary();
    }
  }, [viewMode, loadPartySummary]);

  useEffect(() => {
    if (!consensusAvailable && signalMode === SIGNAL_MODE_CONSENSUS_PROXY) {
      setSignalMode(SIGNAL_MODE_MEDIA_CLIMATE);
    }
  }, [consensusAvailable, setSignalMode, signalMode]);

  // Enrich today data with pre-localized display names, volatility fields,
  // and 14-day trajectory used by momentum-lens sparklines.
  const enrichedData = useMemo(() => {
    const vp = volatilityData?.politicians ?? {};
    return todayData.map((entry) => {
      const v = vp[entry.politician_id];
      return {
        ...entry,
        displayName: localizeName(t, entry.name),
        displayParty: t(`parties.${entry.party}`, { defaultValue: entry.party }),
        is_volatile: v?.is_volatile ?? false,
        overall_score_sigma: v?.overall_score_sigma ?? null,
        volatility_direction: v?.direction ?? null,
        scoreSeries14d: getSparklineData(marketSummaryData, entry.politician_id, signalMode, 14),
      };
    });
  }, [todayData, volatilityData, marketSummaryData, signalMode, t]);

  // Filter state with localStorage persistence
  const filterState = useFilterState(enrichedData);

  // Alert subscription state
  const alertState = useAlertState();

  // Normalize visible politicians for treemap (dynamic min/max), compute
  // interest scores relative to the visible set (so momentum lens answers
  // "who is moving right now among what you're looking at"), then attach
  // your_score under the user's dimension weights (opt-in, used by the
  // your_score lens).
  const treemapData = useMemo(() => {
    const interestEnriched = computeInterestScores(
      normalizeScores(filterState.visible, signalMode)
    );
    return rescoreEntries(interestEnriched, userWeightsApi.weights);
  }, [filterState.visible, signalMode, userWeightsApi.weights]);

  const yourScoreAvailable = useMemo(() => {
    return treemapData.some((entry) => Number.isFinite(entry?.your_score));
  }, [treemapData]);

  // Fall back to momentum if the user selected your_score but the data can't
  // support it (e.g. compact summary missing dims).
  useEffect(() => {
    if (treemapLens === "your_score" && !yourScoreAvailable) {
      setTreemapLens("momentum");
    }
  }, [treemapLens, yourScoreAvailable, setTreemapLens]);

  const rawPartyTimeline = useMemo(() => {
    if (!summaryData.length) return [];
    const hasLatestPartyData = latestDate
      ? partySummaryData.some((entry) => entry.date === latestDate)
      : false;
    const hasLatestPartyConsensus = latestDate
      ? hasConsensusInRows(partySummaryData, latestDate)
      : false;
    const shouldUsePartySummary =
      hasLatestPartyData && (signalMode !== SIGNAL_MODE_CONSENSUS_PROXY || hasLatestPartyConsensus);
    return shouldUsePartySummary ? partySummaryData : derivePartyTimelineFromSummary(summaryData);
  }, [latestDate, partySummaryData, signalMode, summaryData]);

  const marketPartySummaryData = useMemo(() => {
    return getStoredOrAnnotatedMarketTimeline(rawPartyTimeline, "party");
  }, [rawPartyTimeline]);

  // Party data for party view mode
  const partyTreemapData = useMemo(() => {
    if (!latestDate) return [];

    return marketPartySummaryData
      .filter((p) => p.date === latestDate)
      .map((p) => ({
        ...p,
        politician_id: `party:${p.party}`,
        name: p.party,
        displayName: t(`parties.${p.party}`, { defaultValue: p.party }),
        _isParty: true,
      }));
  }, [latestDate, marketPartySummaryData, t]);

  const sidebarData = viewMode === "parties" ? partyTreemapData : filterState.visible;
  const sidebarStats = useSidebarStats(sidebarData, signalMode);

  const handleSelectPolitician = useCallback(
    (name) => {
      if (!latestDate) return;

      if (viewMode === "parties") {
        const matchedPolitician = todayData.find((p) => p.name === name);
        const partyName = matchedPolitician?.party || name;
        logEvent("select_party", { party_name: partyName });
        openPanel(partyName, latestDate, null);
        return;
      }

      const detailKey =
        todayData.find((politician) => politician.name === name)?.politician_id ?? name;
      logEvent("select_politician", { politician_name: name });
      openPanel(name, latestDate, detailKey);
    },
    [latestDate, openPanel, todayData, viewMode]
  );

  // Resolve selectedPolitician (name) → politician_id for liked checks
  const selectedPoliticianId = useMemo(() => {
    if (!selectedPolitician) return null;
    const entry = enrichedData.find((p) => p.name === selectedPolitician);
    return entry?.politician_id || selectedPolitician;
  }, [selectedPolitician, enrichedData]);

  const activeDate = selectedDate || latestDate;
  const activeDetailCacheKey = activeDate
    ? `${activeDate}::${selectedDetailKey || "__date__"}`
    : null;
  const activeDetail = useStore((s) =>
    activeDetailCacheKey ? s.detailCache[activeDetailCacheKey] : null
  );
  const marketSummaryLookup = useMemo(
    () =>
      new Map(marketSummaryData.map((entry) => [`${entry.date}::${entry.politician_id}`, entry])),
    [marketSummaryData]
  );
  const activeDetailWithMarket = useMemo(() => {
    if (!activeDate || !Array.isArray(activeDetail)) return activeDetail;
    return activeDetail.map((entry) => {
      const marketEntry = marketSummaryLookup.get(`${activeDate}::${entry.politician_id}`);
      if (!marketEntry) return entry;
      return {
        ...entry,
        market_score: marketEntry.market_score,
        market_percentile: marketEntry.market_percentile,
        market_tier: marketEntry.market_tier,
        market_delta_points: marketEntry.market_delta_points,
        market_delta_pct: marketEntry.market_delta_pct,
      };
    });
  }, [activeDate, activeDetail, marketSummaryLookup]);

  if (loadError) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-lg">
          {t("app.error.failedToLoadData", { error: loadError })}
        </div>
      </div>
    );
  }

  if (!summaryData.length) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">{t("app.loading.data")}</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-screen bg-gray-950 text-gray-100 md:overflow-hidden overflow-auto"
    >
      <Sidebar
        todayData={sidebarData}
        onMethodologyClick={() => {
          logEvent("open_methodology");
          setMethodologyOpen(true);
        }}
        filterProps={filterState}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          logEvent("switch_view_mode", { mode });
          setViewMode(mode);
        }}
        signalMode={signalMode}
        consensusAvailable={consensusAvailable}
        yourScoreAvailable={yourScoreAvailable}
        onOpenWeights={() => {
          logEvent("open_weights");
          setWeightsOpen(true);
        }}
      />

      {/* Main content — offset by sidebar on desktop, below top bar on mobile */}
      <main className="md:h-screen flex flex-col md:ms-[260px] pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
        {/* Legend strip + last updated */}
        <div className="shrink-0 hidden md:flex items-center justify-between px-3 py-1 bg-gray-950 border-b border-gray-800/50 text-[10px] text-gray-500">
          <span>
            {t("legendStrip.scale")}
            {" · "}
            <span className="text-red-400">{t("legendStrip.red")}</span>
            {" · "}
            <span className="text-emerald-400">{t("legendStrip.green")}</span>
            {" · "}
            ▲▼ = {t("legendStrip.delta")}
          </span>
          {latestDate && <span>{t("legendStrip.updated", { date: latestDate })}</span>}
        </div>
        {/* Primary viewport layout — bounded to the visible viewport on mobile */}
        <div className="h-[calc(100vh-(3.5rem+env(safe-area-inset-top)))] supports-[height:100dvh]:h-[calc(100dvh-(3.5rem+env(safe-area-inset-top)))] md:flex-1 md:min-h-[300px] min-h-0 flex flex-col">
          {/* Daily Insights — top 3 auto-computed insights */}
          <DailyInsights
            data={viewMode === "parties" ? partyTreemapData : enrichedData}
            summaryData={viewMode === "parties" ? marketPartySummaryData : marketSummaryData}
            signalMode={signalMode}
            onSelect={handleSelectPolitician}
            entityMode={viewMode === "parties" ? "party" : "politician"}
          />

          {/* Treemap */}
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 min-w-0 relative">
              <ErrorBoundary>
                <Treemap
                  data={viewMode === "parties" ? partyTreemapData : treemapData}
                  onSelect={handleSelectPolitician}
                  selectedPolitician={selectedPolitician}
                  signalMode={signalMode}
                />
              </ErrorBoundary>
            </div>
            {/* Desktop: Weekly highlights sidebar */}
            <div className="hidden md:block w-[220px] shrink-0 border-s border-gray-800 bg-gray-950/80 overflow-y-auto p-2">
              <WeeklyHighlights
                onSelect={handleSelectPolitician}
                signalMode={signalMode}
                summaryData={viewMode === "parties" ? marketPartySummaryData : marketSummaryData}
                entityMode={viewMode === "parties" ? "party" : "politician"}
              />
              <div className="mt-3">
                <button
                  onClick={() => {
                    logEvent("open_compare");
                    setCompareOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-xs text-indigo-300 font-medium"
                >
                  {t("compare.title")}
                </button>
              </div>
            </div>
          </div>

          {/* Top Movers strip — pinned at bottom */}
          <div className="shrink-0 border-t border-gray-800 bg-gray-950">
            <TopMoversStrip
              data={viewMode === "parties" ? partyTreemapData : enrichedData}
              onSelect={handleSelectPolitician}
              summaryData={viewMode === "parties" ? marketPartySummaryData : marketSummaryData}
              signalMode={signalMode}
              entityMode={viewMode === "parties" ? "party" : "politician"}
            />
          </div>
        </div>

        {/* Mobile: Sidebar content inline below treemap — scroll down to discover */}
        <div className="md:hidden border-t border-gray-800">
          <SidebarContent
            stats={sidebarStats}
            t={t}
            onMethodologyClick={() => {
              logEvent("open_methodology");
              setMethodologyOpen(true);
            }}
            filterProps={filterState}
            viewMode={viewMode}
            onViewModeChange={(mode) => {
              logEvent("switch_view_mode", { mode });
              setViewMode(mode);
            }}
            signalMode={signalMode}
            consensusAvailable={consensusAvailable}
            hideHeader
          />
        </div>
      </main>

      <ErrorBoundary>
        <Suspense fallback={null}>
          <SlidePanel
            isOpen={panelOpen}
            onClose={closePanel}
            title={
              viewMode === "parties" && selectedPolitician
                ? t(`parties.${selectedPolitician}`, { defaultValue: selectedPolitician })
                : selectedPolitician
                  ? localizeName(t, selectedPolitician)
                  : t("app.panel.defaultTitle")
            }
          >
            {viewMode === "parties" ? (
              <PartyDetailView
                partyName={selectedPolitician}
                partyData={partyTreemapData.find((p) => p.name === selectedPolitician)}
                todayData={todayData}
                partySummaryData={marketPartySummaryData}
                signalMode={signalMode}
              />
            ) : (
              <DetailView
                todayDetail={activeDetailWithMarket}
                selectedPolitician={selectedPolitician}
                selectedDate={activeDate}
                loading={detailLoading}
                summaryData={marketSummaryData}
                signalMode={signalMode}
                isLiked={filterState.likedIds.includes(selectedPoliticianId)}
                onToggleLike={filterState.toggleLiked}
                isAlertSubscribed={alertState.isSubscribed(selectedPoliticianId)}
                onToggleAlert={(pid) => {
                  if (alertState.hasSubscription) {
                    alertState.togglePolitician(pid);
                  } else {
                    setAlertModalOpen(true);
                  }
                }}
              />
            )}
          </SlidePanel>
        </Suspense>
      </ErrorBoundary>

      {compareOpen && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <SlidePanel
              isOpen={compareOpen}
              onClose={() => setCompareOpen(false)}
              title={t("compare.title")}
            >
              <CompareView todayData={enrichedData} signalMode={signalMode} />
            </SlidePanel>
          </Suspense>
        </ErrorBoundary>
      )}

      <MethodologyModal isOpen={methodologyOpen} onClose={() => setMethodologyOpen(false)} />

      <Suspense fallback={null}>
        <AlertSubscriptionModal
          isOpen={alertModalOpen}
          onClose={() => setAlertModalOpen(false)}
          onSubscribe={async (email, politicianIds, webhookUrl) => {
            await alertState.subscribe(email, politicianIds, webhookUrl);
          }}
          likedIds={filterState.likedIds}
          allPoliticians={enrichedData}
        />
      </Suspense>

      <WeightsSideSheet
        isOpen={weightsOpen}
        onClose={() => setWeightsOpen(false)}
        weightsApi={userWeightsApi}
      />

      <CookieConsent />
    </div>
  );
}
