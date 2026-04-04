import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import useStore from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar, { SidebarContent } from "./components/Sidebar";
import useSidebarStats from "./lib/useSidebarStats";
import Treemap from "./components/Treemap";
import TopMoversStrip from "./components/TopMoversStrip";
import WeeklyHighlights from "./components/WeeklyHighlights";
import MethodologyModal from "./components/MethodologyModal";
import useFilterState from "./lib/useFilterState";
import normalizeScores from "./lib/normalizeScores";
import { localizeName } from "./lib/localize";
import CookieConsent from "./components/CookieConsent";
import { initAnalytics, logEvent } from "./lib/analytics";
import useAlertState from "./lib/useAlertState";
import { annotateMarketTimeline } from "./lib/marketScore";

const SlidePanel = lazy(() => import("./components/SlidePanel"));
const DetailView = lazy(() => import("./components/DetailView"));
const PartyDetailView = lazy(() => import("./components/PartyDetailView"));
const CompareView = lazy(() => import("./components/CompareView"));
const AlertSubscriptionModal = lazy(() => import("./components/AlertSubscriptionModal"));

function derivePartyTimelineFromSummary(summaryRows) {
  const byDateAndParty = new Map();

  for (const entry of summaryRows) {
    const key = `${entry.date}::${entry.party}`;
    if (!byDateAndParty.has(key)) byDateAndParty.set(key, []);
    byDateAndParty.get(key).push(entry);
  }

  return [...byDateAndParty.values()]
    .map((members) => {
      const sample = members[0];
      const totalVolume = members.reduce((sum, member) => sum + (member.media_volume || 0), 0);
      const weightedScore =
        totalVolume > 0
          ? members.reduce((sum, member) => sum + member.overall_score * member.media_volume, 0) /
            totalVolume
          : members.reduce((sum, member) => sum + member.overall_score, 0) / members.length;
      const scores = members.map((member) => member.overall_score);
      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance =
        scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / Math.max(scores.length, 1);
      const topMember = members.reduce((best, member) =>
        (member.media_volume || 0) > (best?.media_volume || 0) ? member : best
      );

      return {
        date: sample.date,
        party: sample.party,
        wing: sample.wing || null,
        member_count: members.length,
        overall_score: parseFloat(weightedScore.toFixed(1)),
        media_volume: parseFloat(totalVolume.toFixed(1)),
        hostility_avg: null,
        policy_avg: null,
        amplification_avg: null,
        top_politician: topMember?.politician_id || null,
        score_stddev: parseFloat(Math.sqrt(variance).toFixed(2)),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.party.localeCompare(b.party));
}

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
  const panelOpen = useStore((s) => s.panelOpen);
  const selectedPolitician = useStore((s) => s.selectedPolitician);
  const selectedDate = useStore((s) => s.selectedDate);
  const detailLoading = useStore((s) => s.detailLoading);
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
    loadPartySummary();
    loadVolatility();
  }, [loadSummary, loadPartySummary, loadVolatility]);

  const marketSummaryData = useMemo(
    () => annotateMarketTimeline(summaryData, { entityKey: "politician_id" }),
    [summaryData]
  );

  const { todayData, latestDate } = useMemo(() => {
    if (!marketSummaryData.length) return { todayData: [], latestDate: null };

    const allDates = [...new Set(marketSummaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];

    return {
      todayData: marketSummaryData.filter((d) => d.date === latest),
      latestDate: latest,
    };
  }, [marketSummaryData]);

  // Enrich today data with pre-localized display names.
  const enrichedData = useMemo(() => {
    return todayData.map((entry) => {
      return {
        ...entry,
        displayName: localizeName(t, entry.name),
        displayParty: t(`parties.${entry.party}`, { defaultValue: entry.party }),
      };
    });
  }, [todayData, t]);

  // Filter state with localStorage persistence
  const filterState = useFilterState(enrichedData);

  // Alert subscription state
  const alertState = useAlertState();

  // Normalize visible politicians for treemap (dynamic min/max)
  const treemapData = useMemo(() => {
    return normalizeScores(filterState.visible);
  }, [filterState.visible]);

  const rawPartyTimeline = useMemo(() => {
    if (!summaryData.length) return [];
    const hasLatestPartyData = latestDate
      ? partySummaryData.some((entry) => entry.date === latestDate)
      : false;
    return hasLatestPartyData ? partySummaryData : derivePartyTimelineFromSummary(summaryData);
  }, [latestDate, partySummaryData, summaryData]);

  const marketPartySummaryData = useMemo(
    () => annotateMarketTimeline(rawPartyTimeline, { entityKey: "party" }),
    [rawPartyTimeline]
  );

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
  const sidebarStats = useSidebarStats(sidebarData);

  const handleSelectPolitician = useCallback(
    (name) => {
      if (!latestDate) return;

      if (viewMode === "parties") {
        const matchedPolitician = todayData.find((p) => p.name === name);
        const partyName = matchedPolitician?.party || name;
        logEvent("select_party", { party_name: partyName });
        openPanel(partyName, latestDate);
        return;
      }

      logEvent("select_politician", { politician_name: name });
      openPanel(name, latestDate);
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
  const activeDetail = useStore((s) => (activeDate ? s.detailCache[activeDate] : null));
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
        {/* Treemap — full viewport on both mobile and desktop */}
        <div className="h-[calc(100vh-(3.5rem+env(safe-area-inset-top)))] supports-[height:100dvh]:h-[calc(100dvh-(3.5rem+env(safe-area-inset-top)))] md:flex-1 md:min-h-[300px] flex flex-col">
          <div className="flex-1 min-h-0 flex">
            {/* Treemap */}
            <div className="flex-1 min-w-0 relative">
              <ErrorBoundary>
                <Treemap
                  data={viewMode === "parties" ? partyTreemapData : treemapData}
                  onSelect={handleSelectPolitician}
                  selectedPolitician={selectedPolitician}
                />
              </ErrorBoundary>
            </div>
            {/* Desktop: Weekly highlights sidebar */}
            <div className="hidden md:block w-[280px] shrink-0 border-s border-gray-800 bg-gray-950/80 overflow-y-auto p-3">
              <WeeklyHighlights onSelect={handleSelectPolitician} />
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
            <TopMoversStrip data={enrichedData} onSelect={handleSelectPolitician} />
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
              />
            ) : (
              <DetailView
                todayDetail={activeDetailWithMarket}
                selectedPolitician={selectedPolitician}
                selectedDate={activeDate}
                loading={detailLoading}
                summaryData={marketSummaryData}
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
              <CompareView todayData={enrichedData} />
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

      <CookieConsent />
    </div>
  );
}
