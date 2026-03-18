import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import useStore from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Treemap from "./components/Treemap";
import MethodologyModal from "./components/MethodologyModal";

const TrendlineChart = lazy(() => import("./components/TrendlineChart"));
const SlidePanel = lazy(() => import("./components/SlidePanel"));
const DetailView = lazy(() => import("./components/DetailView"));

export default function App() {
  const { t } = useTranslation();
  const [methodologyOpen, setMethodologyOpen] = useState(false);
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

  // Enrich today data with deltas for treemap
  const treemapData = useMemo(() => {
    return todayData.map((entry) => {
      const prev = yesterdayData.find((y) => y.name === entry.name);
      return { ...entry, delta: prev ? entry.overall_score - prev.overall_score : null };
    });
  }, [todayData, yesterdayData]);

  // Top 5 politicians for trendline chart (avoid spaghetti with 30 lines)
  const topPoliticians = useMemo(() => {
    return todayData
      .sort((a, b) => b.media_volume - a.media_volume)
      .slice(0, 5)
      .map((d) => d.name);
  }, [todayData]);

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
    <div className="h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Fixed Sidebar (right side in RTL) */}
      <Sidebar todayData={todayData} onMethodologyClick={() => setMethodologyOpen(true)} />

      {/* Main content area — offset by sidebar width */}
      <main className="h-screen flex flex-col" style={{ marginInlineEnd: 260 }}>
        {/* Treemap — fills available space */}
        <div className="flex-1 min-h-0">
          <ErrorBoundary>
            <Treemap
              data={treemapData}
              onSelect={handleSelectPolitician}
              selectedPolitician={selectedPolitician}
            />
          </ErrorBoundary>
        </div>

        {/* TrendlineChart — bottom strip */}
        <div className="h-64 shrink-0 border-t border-gray-800 bg-gray-950">
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
      </main>

      {/* Slide Panel — opens from the left (opposite sidebar) */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          <SlidePanel
            isOpen={panelOpen}
            onClose={closePanel}
            title={selectedPolitician || t("app.panel.defaultTitle")}
          >
            <DetailView
              todayDetail={activeDetail}
              selectedPolitician={selectedPolitician}
              selectedDate={activeDate}
              loading={detailLoading}
            />
          </SlidePanel>
        </Suspense>
      </ErrorBoundary>

      <MethodologyModal isOpen={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
    </div>
  );
}
