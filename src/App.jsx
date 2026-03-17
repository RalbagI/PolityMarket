import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import PopularityGauge from "./components/PopularityGauge";
import TrendlineChart from "./components/TrendlineChart";
import Leaderboard from "./components/Leaderboard";
import DetailView from "./components/DetailView";
import ShareOfVoice from "./components/ShareOfVoice";
import SlidePanel from "./components/SlidePanel";

const NEUTRAL_COLORS = {
  Likud: "#6b7280",
  "Yesh Atid": "#6b7280",
  "National Unity": "#6b7280",
  "Religious Zionism": "#6b7280",
  "Yisrael Beiteinu": "#6b7280",
};

export default function App() {
  const [summaryData, setSummaryData] = useState([]);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedPolitician, setSelectedPolitician] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetch("/data/timeseries_summary.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setSummaryData)
      .catch((err) => setLoadError(err.message));
  }, []);

  const fetchDetail = useCallback(async (date) => {
    let alreadyCached = false;
    setDetailCache((prev) => {
      if (prev[date]) alreadyCached = true;
      return prev;
    });
    if (alreadyCached) return;

    setDetailLoading(true);
    try {
      const res = await fetch(`/data/details/${date}.json`);
      if (!res.ok) return;
      const detail = await res.json();
      setDetailCache((prev) => ({ ...prev, [date]: detail }));
    } catch {
      // Detail fetch failed
    } finally {
      setDetailLoading(false);
    }
  }, []);

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

  // Open panel for a politician (from leaderboard — uses today's date)
  const handleSelectPolitician = useCallback(
    (name) => {
      setSelectedPolitician(name);
      setSelectedDate(latestDate);
      setPanelOpen(true);
      if (latestDate) fetchDetail(latestDate);
    },
    [latestDate, fetchDetail]
  );

  // Ref to avoid stale closure in handleDateClick
  const selectedPoliticianRef = useRef(selectedPolitician);
  selectedPoliticianRef.current = selectedPolitician;

  // Open panel from chart click (uses clicked date, keeps current politician or picks first)
  const handleDateClick = useCallback(
    (date) => {
      setSelectedDate(date);
      if (!selectedPoliticianRef.current && politicians.length) {
        setSelectedPolitician(politicians[0]);
      }
      setPanelOpen(true);
      fetchDetail(date);
    },
    [politicians, fetchDetail]
  );

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const activeDate = selectedDate || latestDate;
  const activeDetail = activeDate ? detailCache[activeDate] : null;

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-lg">Failed to load data: {loadError}</div>
      </div>
    );
  }

  if (!summaryData.length) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-sm">
              PM
            </div>
            <h1 className="text-xl font-bold tracking-tight">PolityMarket</h1>
          </div>
          <p className="text-sm text-gray-500 hidden sm:block">
            Israeli Political Sentiment Tracker
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PopularityGauge
          todayData={todayData}
          yesterdayData={yesterdayData}
          summaryData={summaryData}
        />

        <TrendlineChart
          data={summaryData}
          dates={dates}
          politicians={politicians}
          onDateClick={handleDateClick}
        />

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

      {/* Sliding Detail Panel */}
      <SlidePanel
        isOpen={panelOpen}
        onClose={handleClosePanel}
        title={selectedPolitician || "Details"}
      >
        <DetailView
          todayDetail={activeDetail}
          selectedPolitician={selectedPolitician}
          selectedDate={activeDate}
          loading={detailLoading}
        />
      </SlidePanel>

      <footer className="border-t border-gray-800/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          PolityMarket &middot; Data updates daily at 2:00 AM IST &middot; Powered by AI sentiment
          analysis
        </div>
      </footer>
    </div>
  );
}
