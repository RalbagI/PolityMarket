import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import useStore from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Treemap from "./components/Treemap";
import TopMoversStrip from "./components/TopMoversStrip";
import MethodologyModal from "./components/MethodologyModal";
import useFilterState from "./lib/useFilterState";
import normalizeScores from "./lib/normalizeScores";
import { localizeName } from "./lib/localize";
import CookieConsent from "./components/CookieConsent";

const SlidePanel = lazy(() => import("./components/SlidePanel"));
const DetailView = lazy(() => import("./components/DetailView"));

export default function App() {
  const { t } = useTranslation();
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [viewMode, setViewMode] = useState("politicians"); // "politicians" | "parties"
  const summaryData = useStore((s) => s.summaryData);
  const partySummaryData = useStore((s) => s.partySummaryData);
  const loadError = useStore((s) => s.loadError);
  const loadSummary = useStore((s) => s.loadSummary);
  const loadPartySummary = useStore((s) => s.loadPartySummary);
  const panelOpen = useStore((s) => s.panelOpen);
  const selectedPolitician = useStore((s) => s.selectedPolitician);
  const selectedDate = useStore((s) => s.selectedDate);
  const detailLoading = useStore((s) => s.detailLoading);
  const openPanel = useStore((s) => s.openPanel);
  const closePanel = useStore((s) => s.closePanel);

  useEffect(() => {
    loadSummary();
    loadPartySummary();
  }, [loadSummary, loadPartySummary]);

  const { todayData, yesterdayData, latestDate } = useMemo(() => {
    if (!summaryData.length) return { todayData: [], yesterdayData: [], latestDate: null };

    const allDates = [...new Set(summaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];
    const previousDate = allDates[allDates.length - 2];

    return {
      todayData: summaryData.filter((d) => d.date === latest),
      yesterdayData: previousDate ? summaryData.filter((d) => d.date === previousDate) : [],
      latestDate: latest,
    };
  }, [summaryData]);

  // Enrich today data with deltas + pre-localized display names
  // This ensures NO English names leak to any downstream component
  const enrichedData = useMemo(() => {
    return todayData.map((entry) => {
      const prev = yesterdayData.find((y) => y.name === entry.name);
      return {
        ...entry,
        displayName: localizeName(t, entry.name),
        displayParty: t(`parties.${entry.party}`, { defaultValue: entry.party }),
        delta: prev ? entry.overall_score - prev.overall_score : null,
      };
    });
  }, [todayData, yesterdayData, t]);

  // Filter state with localStorage persistence
  const filterState = useFilterState(enrichedData);

  // Normalize visible politicians for treemap (dynamic min/max)
  const treemapData = useMemo(() => {
    return normalizeScores(filterState.visible);
  }, [filterState.visible]);

  // Party data for party view mode
  const partyTreemapData = useMemo(() => {
    if (!partySummaryData.length || !latestDate) return [];
    const todayParties = partySummaryData.filter((p) => p.date === latestDate);
    return todayParties.map((p) => ({
      ...p,
      politician_id: `party:${p.party}`,
      name: p.party,
      displayName: t(`parties.${p.party}`, { defaultValue: p.party }),
      _isParty: true,
    }));
  }, [partySummaryData, latestDate, t]);

  const sidebarData = viewMode === "parties" ? partyTreemapData : filterState.visible;

  const handleSelectPolitician = useCallback(
    (name) => {
      // In party mode, don't open the politician detail panel
      if (viewMode === "parties") return;
      if (latestDate) openPanel(name, latestDate);
    },
    [latestDate, openPanel, viewMode]
  );

  // Resolve selectedPolitician (name) → politician_id for liked checks
  const selectedPoliticianId = useMemo(() => {
    if (!selectedPolitician) return null;
    const entry = enrichedData.find((p) => p.name === selectedPolitician);
    return entry?.politician_id || selectedPolitician;
  }, [selectedPolitician, enrichedData]);

  const activeDate = selectedDate || latestDate;
  const activeDetail = useStore((s) => (activeDate ? s.detailCache[activeDate] : null));

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
    <div className="h-screen bg-gray-950 text-gray-100 md:overflow-hidden overflow-auto">
      <Sidebar
        todayData={sidebarData}
        onMethodologyClick={() => setMethodologyOpen(true)}
        filterProps={filterState}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main content — offset by sidebar on desktop, below top bar on mobile */}
      <main className="h-[calc(100vh-(3.5rem+env(safe-area-inset-top)))] supports-[height:100dvh]:h-[calc(100dvh-(3.5rem+env(safe-area-inset-top)))] md:h-screen flex flex-col md:ms-[260px] pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0">
        {/* Treemap — explicit height so flex-1 + h-full resolves in scrollable parent */}
        <div className="flex-1 min-h-[40vh] sm:min-h-[50vh] md:min-h-[300px]">
          <ErrorBoundary>
            <Treemap
              data={viewMode === "parties" ? partyTreemapData : treemapData}
              onSelect={handleSelectPolitician}
              selectedPolitician={selectedPolitician}
            />
          </ErrorBoundary>
        </div>

        {/* Top Movers strip — always visible */}
        <div className="shrink-0 border-t border-gray-800 bg-gray-950">
          <TopMoversStrip data={enrichedData} onSelect={handleSelectPolitician} />
        </div>
      </main>

      <ErrorBoundary>
        <Suspense fallback={null}>
          <SlidePanel
            isOpen={panelOpen}
            onClose={closePanel}
            title={
              selectedPolitician ? localizeName(t, selectedPolitician) : t("app.panel.defaultTitle")
            }
          >
            <DetailView
              todayDetail={activeDetail}
              selectedPolitician={selectedPolitician}
              selectedDate={activeDate}
              loading={detailLoading}
              isLiked={filterState.likedIds.includes(selectedPoliticianId)}
              onToggleLike={filterState.toggleLiked}
            />
          </SlidePanel>
        </Suspense>
      </ErrorBoundary>

      <MethodologyModal isOpen={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
      <CookieConsent />
    </div>
  );
}
