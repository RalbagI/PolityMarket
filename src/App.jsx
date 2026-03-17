import { useState, useEffect, useMemo, useCallback } from "react";
import PopularityGauge from "./components/PopularityGauge";
import TrendlineChart from "./components/TrendlineChart";
import Leaderboard from "./components/Leaderboard";
import DetailView from "./components/DetailView";
import ShareOfVoice from "./components/ShareOfVoice";

// Neutral, non-party-affiliated colors to prevent subconscious political bias.
// Uses desaturated tones that carry no party association.
const NEUTRAL_COLORS = {
  Likud: "#6b7280",
  "Yesh Atid": "#6b7280",
  "National Unity": "#6b7280",
  "Religious Zionism": "#6b7280",
  "Yisrael Beiteinu": "#6b7280",
};

export default function App() {
  const [summaryData, setSummaryData] = useState([]);
  const [selectedPolitician, setSelectedPolitician] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

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
      return {
        dates: [],
        politicians: [],
        todayData: [],
        yesterdayData: [],
        latestDate: null,
      };

    const allDates = [...new Set(summaryData.map((d) => d.date))].sort();
    const latest = allDates[allDates.length - 1];
    const previousDate = allDates[allDates.length - 2];
    const uniqueNames = [...new Set(summaryData.map((d) => d.name))];

    const today = summaryData.filter((d) => d.date === latest);
    const yesterday = previousDate ? summaryData.filter((d) => d.date === previousDate) : [];

    return {
      dates: allDates,
      politicians: uniqueNames,
      todayData: today,
      yesterdayData: yesterday,
      latestDate: latest,
    };
  }, [summaryData]);

  useEffect(() => {
    if (selectedPolitician && latestDate) {
      fetchDetail(latestDate);
    }
  }, [selectedPolitician, latestDate, fetchDetail]);

  const todayDetail = latestDate ? detailCache[latestDate] : null;

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
        {/* Popularity Index Gauges — replaces old Biggest Mover hero */}
        <PopularityGauge
          todayData={todayData}
          yesterdayData={yesterdayData}
          summaryData={summaryData}
        />

        {/* Dual-axis trendline with SMA toggle */}
        <TrendlineChart data={summaryData} dates={dates} politicians={politicians} />

        {/* Share of Voice + Leaderboard + Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ShareOfVoice todayData={todayData} />
          </div>
          <div className="lg:col-span-2">
            <Leaderboard
              todayData={todayData}
              yesterdayData={yesterdayData}
              partyColors={NEUTRAL_COLORS}
              selectedPolitician={selectedPolitician}
              onSelect={setSelectedPolitician}
            />
          </div>
          <div className="lg:col-span-1">
            <DetailView
              todayDetail={todayDetail}
              selectedPolitician={selectedPolitician}
              loading={detailLoading}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          PolityMarket &middot; Data updates daily at 2:00 AM IST &middot; Powered by AI sentiment
          analysis
        </div>
      </footer>
    </div>
  );
}
