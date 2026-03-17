import { useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import useStore from "./store";
import ErrorBoundary from "./components/ErrorBoundary";
import PopularityGauge from "./components/PopularityGauge";
import ShareOfVoice from "./components/ShareOfVoice";
import Leaderboard from "./components/Leaderboard";

const TrendlineChart = lazy(() => import("./components/TrendlineChart"));
const SlidePanel = lazy(() => import("./components/SlidePanel"));
const DetailView = lazy(() => import("./components/DetailView"));

const NEUTRAL_COLORS = {
  Likud: "#6b7280",
  "Yesh Atid": "#6b7280",
  "National Unity": "#6b7280",
  "Religious Zionism": "#6b7280",
  "Yisrael Beiteinu": "#6b7280",
};

function ChartFallback() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 h-80 flex items-center justify-center">
      <div className="text-gray-500 text-sm">{t("app.loading.chart")}</div>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-lg">
          {t("app.error.failedToLoadData", { error: loadError })}
        </div>
      </div>
    );
  }

  if (!summaryData.length) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">{t("app.loading.data")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">
              {t("app.header.logo")}
            </div>
            <h1 className="text-xl font-bold tracking-tight">{t("app.header.title")}</h1>
          </div>
          <p className="text-sm text-gray-500 hidden sm:block">{t("app.header.subtitle")}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PopularityGauge
          todayData={todayData}
          yesterdayData={yesterdayData}
          summaryData={summaryData}
        />

        <ErrorBoundary>
          <Suspense fallback={<ChartFallback />}>
            <TrendlineChart
              data={summaryData}
              dates={dates}
              politicians={politicians}
              onDateClick={handleDateClick}
            />
          </Suspense>
        </ErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ShareOfVoice todayData={todayData} />
          </div>
          <div className="lg:col-span-2">
            <Leaderboard
              todayData={todayData}
              yesterdayData={yesterdayData}
              partyColors={NEUTRAL_COLORS}
              selectedPolitician={selectedPolitician}
              onSelect={handleSelectPolitician}
            />
          </div>
        </div>
      </main>

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

      <footer className="border-t border-gray-800/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          {t("app.footer.text")}
        </div>
      </footer>
    </div>
  );
}
