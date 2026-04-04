import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Search } from "lucide-react";
import { localizeName, localizeParty } from "../lib/localize";
import { resolveSignalDisplayScore } from "../lib/signalMode";
import Avatar from "./Avatar";
import PoliticianTrendChart from "./PoliticianTrendChart";

const DIM_KEYS = [
  "dim_public_sentiment",
  "dim_parliamentary_activity",
  "dim_media_credibility",
  "dim_transparency_ethics",
  "dim_field_activity",
  "dim_satire_cultural_impact",
  "dim_legislative_quality",
  "dim_flipflop_index",
];

const DIM_COLORS = {
  dim_public_sentiment: "#6366f1",
  dim_parliamentary_activity: "#8b5cf6",
  dim_media_credibility: "#06b6d4",
  dim_transparency_ethics: "#10b981",
  dim_field_activity: "#f59e0b",
  dim_satire_cultural_impact: "#f43f5e",
  dim_legislative_quality: "#a855f7",
  dim_flipflop_index: "#14b8a6",
};

function PoliticianPicker({
  label,
  selected,
  onSelect,
  politicians,
  t,
  signalMode = "media_climate",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return politicians;
    const q = search.toLowerCase();
    return politicians.filter(
      (p) => p.name.toLowerCase().includes(q) || localizeName(t, p.name).includes(q)
    );
  }, [politicians, search, t]);

  if (!open && selected) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-gray-900 border border-gray-800 p-3 hover:border-gray-700 transition-colors w-full"
      >
        <Avatar name={selected.name} politicianId={selected.politician_id} size={40} />
        <div className="text-start flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {localizeName(t, selected.name)}
          </div>
          <div className="text-[10px] text-gray-500">{localizeParty(t, selected.party)}</div>
        </div>
        <div className="text-end shrink-0">
          <div className="text-lg font-bold text-white">
            {Math.round(resolveSignalDisplayScore(selected, signalMode) ?? 0)}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-3 w-full">
      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
        {label}
      </div>
      <div className="relative mb-2">
        <Search className="absolute start-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("filterBar.search.placeholder")}
          className="w-full bg-gray-800 rounded-lg text-xs text-gray-200 py-1.5 ps-7 pe-2 border border-gray-700 focus:border-gray-600 outline-none"
          autoFocus
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-0.5">
        {filtered.slice(0, 20).map((p) => (
          <button
            key={p.politician_id || p.name}
            onClick={() => {
              onSelect(p);
              setOpen(false);
              setSearch("");
            }}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-gray-800 transition-colors"
          >
            <Avatar name={p.name} politicianId={p.politician_id} size={24} />
            <span className="text-xs text-gray-200 truncate flex-1 text-start">
              {localizeName(t, p.name)}
            </span>
            <span className="text-xs text-gray-500 tabular-nums">
              {Math.round(resolveSignalDisplayScore(p, signalMode) ?? 0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DimensionCompare({ dimKey, labelKey, a, b, t }) {
  const valA = a?.[dimKey];
  const valB = b?.[dimKey];
  const color = DIM_COLORS[dimKey];

  const pctA = valA != null ? Math.min(valA * 100, 100) : 0;
  const pctB = valB != null ? Math.min(valB * 100, 100) : 0;
  const isNullA = valA == null;
  const isNullB = valB == null;

  return (
    <div className="space-y-1">
      <div className="text-[10px] text-gray-500 text-center">
        {t(`detailView.dimension.${labelKey}`)}
      </div>
      <div className="flex items-center gap-2">
        {/* A bar (grows right-to-left) */}
        <div className="flex-1 flex justify-end">
          {isNullA ? (
            <span className="text-[9px] text-gray-700 italic">—</span>
          ) : (
            <div className="w-full bg-gray-800 rounded-full h-1.5 relative">
              <div
                className="absolute end-0 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pctA}%`, backgroundColor: color }}
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 shrink-0 w-20 justify-center">
          <span className="text-[10px] font-bold text-white tabular-nums w-8 text-end">
            {isNullA ? "—" : valA.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-white tabular-nums w-8 text-start">
            {isNullB ? "—" : valB.toFixed(2)}
          </span>
        </div>
        {/* B bar (grows left-to-right) */}
        <div className="flex-1">
          {isNullB ? (
            <span className="text-[9px] text-gray-700 italic">—</span>
          ) : (
            <div className="w-full bg-gray-800 rounded-full h-1.5 relative">
              <div
                className="absolute start-0 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pctB}%`, backgroundColor: color }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompareView({ todayData, signalMode = "media_climate" }) {
  const { t } = useTranslation();
  const [politicianA, setPoliticianA] = useState(null);
  const [politicianB, setPoliticianB] = useState(null);

  // Get detail data for selected politicians (from latest detail or todayData)
  const detailA = useMemo(() => {
    if (!politicianA) return null;
    return todayData.find(
      (d) => d.name === politicianA.name || d.politician_id === politicianA.politician_id
    );
  }, [politicianA, todayData]);

  const detailB = useMemo(() => {
    if (!politicianB) return null;
    return todayData.find(
      (d) => d.name === politicianB.name || d.politician_id === politicianB.politician_id
    );
  }, [politicianB, todayData]);

  const dimLabels = [
    "publicSentiment",
    "parliamentaryActivity",
    "mediaCredibility",
    "transparencyEthics",
    "fieldActivity",
    "satireCulturalImpact",
    "legislativeQuality",
    "flipflopIndex",
  ];

  return (
    <div className="space-y-4">
      {/* Picker row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <PoliticianPicker
            label={t("compare.pickA")}
            selected={politicianA}
            onSelect={setPoliticianA}
            politicians={todayData}
            t={t}
            signalMode={signalMode}
          />
        </div>
        <div className="shrink-0">
          <ArrowLeftRight className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <PoliticianPicker
            label={t("compare.pickB")}
            selected={politicianB}
            onSelect={setPoliticianB}
            politicians={todayData}
            t={t}
            signalMode={signalMode}
          />
        </div>
      </div>

      {/* Overall score comparison */}
      {politicianA && politicianB && (
        <>
          <div className="flex items-center justify-center gap-6 py-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {Math.round(resolveSignalDisplayScore(politicianA, signalMode) ?? 0)}
              </div>
              <div className="text-[10px] text-gray-500">{localizeName(t, politicianA.name)}</div>
            </div>
            <div className="text-lg text-gray-600 font-light">vs</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {Math.round(resolveSignalDisplayScore(politicianB, signalMode) ?? 0)}
              </div>
              <div className="text-[10px] text-gray-500">{localizeName(t, politicianB.name)}</div>
            </div>
          </div>

          {/* Dimension-by-dimension comparison */}
          <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center">
              {t("compare.dimensions")}
            </div>
            {DIM_KEYS.map((key, i) => (
              <DimensionCompare
                key={key}
                dimKey={key}
                labelKey={dimLabels[i]}
                a={detailA}
                b={detailB}
                t={t}
              />
            ))}
          </div>

          {/* Trend charts side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
              <div className="text-xs font-medium text-gray-400 mb-2 text-center">
                {localizeName(t, politicianA.name)}
              </div>
              <PoliticianTrendChart politicianName={politicianA.name} signalMode={signalMode} />
            </div>
            <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-3">
              <div className="text-xs font-medium text-gray-400 mb-2 text-center">
                {localizeName(t, politicianB.name)}
              </div>
              <PoliticianTrendChart politicianName={politicianB.name} signalMode={signalMode} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
