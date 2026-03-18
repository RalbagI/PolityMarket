import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";
import useStore from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Treemap from "./components/Treemap";
import MethodologyModal from "./components/MethodologyModal";
import useFilterState from "./lib/useFilterState";
import normalizeScores from "./lib/normalizeScores";
import { localizeName } from "./lib/localize";
import CookieConsent from "./components/CookieConsent";

const TrendlineChart = lazy(() => import("./components/TrendlineChart"));
const SlidePanel = lazy(() => import("./components/SlidePanel"));
const DetailView = lazy(() => import("./components/DetailView"));

export default function App() {
  const { t } = useTranslation();
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [chartVisible, setChartVisible] = useState(false);
  const summaryData = useStore((s) => s.summaryData);
  const loadError = useStore((s) => s.loadError);
  const loadSummary = useStore((s) => s.loadSummary);
  const panelOpen = useStore((s) => s.panelOpen);
  const selectedPolitician = useStore((s) => s.selectedPolitician);
  const selectedDate = useStore((s) => s.selectedDate);
  const detailLoading = useStore((s) => s.detailLoading);
  const openPanel = useStore((s) => s.openPanel);
  const closePanel = useStore((s) => s.closePanel);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const { dates, politicians, todayData, yesterdayData, latestDate } = useMemo(() => {
    if (!summaryData.length)
      return { dates: [], politicians: [], todayData: [], yesterdayData: [], latestDate: null };

    const allDates = [...new Set(summaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];
    const previousDate = allDates[allDates.length - 2];
    const uniqueNames = [...new Set(summaryData.map((d) => d.name))];

    return {
      dates: allDates,
      politicians: uniqueNames,
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

  const topPoliticians = useMemo(() => {
    return [...filterState.visible]
      .sort((a, b) => b.media_volume - a.media_volume)
      .slice(0, 5)
      .map((d) => d.name);
  }, [filterState.visible]);

  const handleSelectPolitician = useCallback(
    (name) => {
      if (latestDate) openPanel(name, latestDate);
    },
    [latestDate, openPanel]
  );

  const handleDateClick = useCallback(
    (date) => {
      const politician = useStore.getState().selectedPolitician || politicians[0];
      openPanel(politician, date);
    },
    [politicians, openPanel]
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
        todayData={filterState.visible}
        onMethodologyClick={() => setMethodologyOpen(true)}
        filterProps={filterState}
      />

      {/* Main content — offset by sidebar on desktop, below top bar on mobile */}
      <main className="md:h-screen flex flex-col md:ms-[260px] pt-14 md:pt-0">
        {/* Treemap */}
        <div className="flex-1 min-h-[50vh] md:min-h-[300px]">
          <ErrorBoundary>
            <Treemap
              data={treemapData}
              onSelect={handleSelectPolitician}
              selectedPolitician={selectedPolitician}
            />
          </ErrorBoundary>
        </div>

        {/* Chart toggle + TrendlineChart */}
        <div className="shrink-0 border-t border-gray-800 bg-gray-950">
          <button
            onClick={() => setChartVisible(!chartVisible)}
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {chartVisible ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {chartVisible ? t("app.chart.hide") : t("app.chart.show")}
          </button>

          {chartVisible && (
            <div className="h-48 md:h-64">
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                      {t("app.loading.chart")}
                    </div>
                  }
                >
                  <TrendlineChart
                    data={summaryData}
                    dates={dates}
                    politicians={topPoliticians}
                    onDateClick={handleDateClick}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
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
