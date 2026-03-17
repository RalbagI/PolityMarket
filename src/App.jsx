import { useState, useEffect, useMemo } from "react";
import HeroSection from "./components/HeroSection";
import TrendlineChart from "./components/TrendlineChart";
import Leaderboard from "./components/Leaderboard";
import DetailView from "./components/DetailView";

const PARTY_COLORS = {
  Likud: "#2563eb",
  "Yesh Atid": "#f59e0b",
  "National Unity": "#6366f1",
  "Religious Zionism": "#dc2626",
  "Yisrael Beiteinu": "#0d9488",
};

export default function App() {
  const [data, setData] = useState([]);
  const [selectedPolitician, setSelectedPolitician] = useState(null);

  useEffect(() => {
    fetch("/data/historical_scores.json")
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error("Failed to load data:", err));
  }, []);

  const { dates, politicians, todayData, yesterdayData, biggestMover } =
    useMemo(() => {
      if (!data.length)
        return {
          dates: [],
          politicians: [],
          todayData: [],
          yesterdayData: [],
          biggestMover: null,
        };

      const allDates = [...new Set(data.map((d) => d.date))].sort();
      const latestDate = allDates[allDates.length - 1];
      const previousDate = allDates[allDates.length - 2];
      const uniqueNames = [...new Set(data.map((d) => d.name))];

      const today = data.filter((d) => d.date === latestDate);
      const yesterday = previousDate
        ? data.filter((d) => d.date === previousDate)
        : [];

      let mover = null;
      let maxDelta = 0;
      for (const entry of today) {
        const prev = yesterday.find((y) => y.name === entry.name);
        if (prev) {
          const delta = Math.abs(entry.overall_score - prev.overall_score);
          if (delta > maxDelta) {
            maxDelta = delta;
            mover = {
              ...entry,
              delta: entry.overall_score - prev.overall_score,
              previousScore: prev.overall_score,
            };
          }
        }
      }

      return {
        dates: allDates,
        politicians: uniqueNames,
        todayData: today,
        yesterdayData: yesterday,
        biggestMover: mover,
      };
    }, [data]);

  if (!data.length) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              PM
            </div>
            <h1 className="text-xl font-bold tracking-tight">PoliticMarket</h1>
          </div>
          <p className="text-sm text-gray-500 hidden sm:block">
            Israeli Political Sentiment Tracker
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {biggestMover && (
          <HeroSection mover={biggestMover} partyColors={PARTY_COLORS} />
        )}

        <TrendlineChart
          data={data}
          dates={dates}
          politicians={politicians}
          partyColors={PARTY_COLORS}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Leaderboard
              todayData={todayData}
              yesterdayData={yesterdayData}
              partyColors={PARTY_COLORS}
              selectedPolitician={selectedPolitician}
              onSelect={setSelectedPolitician}
            />
          </div>
          <div className="lg:col-span-1">
            <DetailView
              todayData={todayData}
              selectedPolitician={selectedPolitician}
              partyColors={PARTY_COLORS}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-600">
          PoliticMarket &middot; Data updates daily at 2:00 AM IST &middot;
          Powered by AI sentiment analysis
        </div>
      </footer>
    </div>
  );
}
