import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { scoreToColor } from "../lib/colorScale";
import { TALKPOINT_LABEL } from "../lib/brand";
import { localizeParty } from "../lib/localize";
import useFocusTrap from "../lib/useFocusTrap";
import useSidebarStats from "../lib/useSidebarStats";
import FilterBar from "./FilterBar";
import QuickAbout from "./QuickAbout";
import LanguageToggle from "./LanguageToggle";
import useStore from "../store";

export function DisplayOptions({ t }) {
  const sizeBy = useStore((s) => s.treemapSizeBy);
  const colorBy = useStore((s) => s.treemapColorBy);
  const setSizeBy = useStore((s) => s.setTreemapSizeBy);
  const setColorBy = useStore((s) => s.setTreemapColorBy);
  const signalMode = useStore((s) => s.signalMode);

  const options = [
    { value: "media_volume", label: t("treemap.options.mediaVolume") },
    {
      value: "market_score",
      label:
        signalMode === "consensus_proxy" ? t("signals.consensusProxy") : t("signals.mediaClimate"),
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {t("treemap.options.title")}
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-500 shrink-0">{t("treemap.options.sizeBy")}</div>
          <div className="flex gap-1 flex-wrap">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => setSizeBy(o.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  sizeBy === o.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-500 hover:text-gray-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-gray-500 shrink-0">{t("treemap.options.colorBy")}</div>
          <div className="flex gap-1 flex-wrap">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => setColorBy(o.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  colorBy === o.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-500 hover:text-gray-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarContent({
  stats,
  t,
  onMethodologyClick,
  filterProps,
  viewMode,
  onViewModeChange,
  signalMode,
  consensusAvailable = false,
  yourScoreAvailable = false,
  onOpenWeights,
  onCompare,
  hideHeader,
  compact,
}) {
  const setSignalMode = useStore((s) => s.setSignalMode);
  const colorBy = useStore((s) => s.treemapColorBy);
  const lens = useStore((s) => s.treemapLens);
  const setLens = useStore((s) => s.setTreemapLens);
  const activeFilterCount = filterProps
    ? (filterProps.activeParties?.length || 0) +
      (filterProps.activeWings?.length || 0) +
      (filterProps.activeSectors?.length || 0) +
      (filterProps.showLikedOnly ? 1 : 0)
    : 0;

  return (
    <div className="p-5 space-y-6">
      {!hideHeader && (
        <>
          {/* App Header — LanguageToggle pinned via justify-between so the
              scrollbar (opposite edge in both LTR/RTL) never clips it. */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <img
                  src="/politymarket-mark.svg"
                  alt="PolityMarket logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="flex-1 min-w-0 truncate text-lg font-bold text-white tracking-tight">
                PolityMarket
              </h1>
              <div className="shrink-0">
                <QuickAbout onOpenFullMethodology={onMethodologyClick} />
              </div>
              <div className="shrink-0">
                <LanguageToggle />
              </div>
            </div>
            <p className="text-xs text-gray-500">{t("app.header.subtitle")}</p>
          </div>

          {/* Total + Weighted Average */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 rounded-xl p-3">
              <div className="text-2xl font-black text-white">{stats.total}</div>
              <div className="text-xs text-gray-500">
                {viewMode === "parties" ? t("sidebar.totalParties") : t("sidebar.totalTracked")}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-3">
              <div
                className="text-2xl font-black"
                style={{ color: scoreToColor(stats.weightedAvg) }}
              >
                {Math.round(stats.weightedAvg)}
              </div>
              <div className="text-xs text-gray-500">
                {signalMode === "consensus_proxy"
                  ? t("signals.consensusProxy")
                  : t("signals.mediaClimate")}
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Mode Toggle */}
      {onViewModeChange && (
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange("politicians")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === "politicians"
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t("sidebar.viewMode.politicians")}
          </button>
          <button
            onClick={() => onViewModeChange("parties")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === "parties"
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t("sidebar.viewMode.parties")}
          </button>
        </div>
      )}

      {/* Lens toggle — momentum (who's moving) vs. market (current state) */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {t("treemap.lens.label")}
        </h3>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setLens("momentum")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              lens === "momentum" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t("treemap.lens.momentum")}
          </button>
          <button
            onClick={() => setLens("market")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              lens === "market" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t("treemap.lens.market")}
          </button>
          <button
            onClick={() => {
              if (yourScoreAvailable) setLens("your_score");
            }}
            disabled={!yourScoreAvailable}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              lens === "your_score"
                ? "bg-amber-500 text-gray-950"
                : yourScoreAvailable
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-600 cursor-not-allowed"
            }`}
          >
            {t("treemap.lens.yourScore")}
          </button>
        </div>
        <p className="text-[11px] leading-4 text-gray-500">
          {lens === "momentum"
            ? t("treemap.lens.momentumHint")
            : lens === "your_score"
              ? t("treemap.lens.yourScoreHint")
              : t("treemap.lens.marketHint")}
        </p>
        {onOpenWeights && yourScoreAvailable && (
          <button
            onClick={onOpenWeights}
            className="w-full rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1.5 text-[11px] font-medium text-amber-200 transition-colors hover:bg-amber-500/10"
          >
            {t("weights.openButton")}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {t("signals.title")}
        </h3>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setSignalMode("media_climate")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              signalMode === "media_climate"
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t("signals.mediaClimate")}
          </button>
          <button
            onClick={() => {
              if (consensusAvailable) setSignalMode("consensus_proxy");
            }}
            disabled={!consensusAvailable}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              signalMode === "consensus_proxy"
                ? "bg-gray-700 text-white"
                : consensusAvailable
                  ? "text-gray-500 hover:text-gray-300"
                  : "text-gray-600 cursor-not-allowed"
            }`}
          >
            {t("signals.consensusProxy")}
          </button>
        </div>
        {!consensusAvailable && (
          <p className="text-[11px] leading-5 text-gray-500">{t("signals.consensusUnavailable")}</p>
        )}
      </div>

      {/* Display Options — only relevant when the treemap is in market lens */}
      {lens === "market" && <DisplayOptions t={t} />}

      {/* Filters — only in politicians view */}
      {viewMode !== "parties" && filterProps && <FilterBar {...filterProps} />}
      {viewMode === "parties" && activeFilterCount > 0 && onViewModeChange && (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
          <p className="text-xs text-gray-400 mb-2">
            {t("sidebar.partyMode.filtersHidden", { count: activeFilterCount })}
          </p>
          <button
            onClick={() => onViewModeChange("politicians")}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
          >
            {t("sidebar.partyMode.switchToPoliticians")}
          </button>
        </div>
      )}

      {stats.total === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">{t("filterBar.noResults")}</p>
      ) : (
        !compact && (
          <>
            {/* Color legend — only relevant when market lens honors colorBy */}
            {lens === "market" && (
              <div>
                <div
                  className="h-2 rounded-full"
                  style={{
                    background:
                      colorBy === "media_volume"
                        ? "linear-gradient(to right, #1e3a8a, #2563eb, #67e8f9)"
                        : "linear-gradient(to right, #0d9488, #22c55e, #facc15, #f97316, #dc2626)",
                  }}
                />
                <div className="flex justify-between mt-1">
                  {colorBy === "media_volume" ? (
                    <>
                      <span className="text-[10px] text-gray-500">
                        {t("sidebar.colorLegend.lowVolume")}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {t("sidebar.colorLegend.highVolume")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-gray-500">
                        {t("sidebar.colorLegend.positive")}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {t("sidebar.colorLegend.negative")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Party Breakdown — only in politicians view (redundant in party mode) */}
            {viewMode !== "parties" && (
              <div>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  {t("sidebar.partyBreakdown")}
                </h3>
                <div className="space-y-1.5">
                  {stats.parties.map(({ party, count, color }) => (
                    <div key={party} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: color.accent }}
                        />
                        <span className="text-gray-300">{localizeParty(t, party)}</span>
                      </div>
                      <span className="text-gray-500 font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* Compare button */}
      {onCompare && (
        <button
          onClick={onCompare}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-xs text-indigo-300 font-medium"
        >
          {t("compare.title")}
        </button>
      )}

      {/* Methodology Link */}
      {!compact && (
        <button
          onClick={onMethodologyClick}
          className="w-full text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 text-start transition-colors"
        >
          {t("methodology.link")}
        </button>
      )}

      {/* TalkPoint attribution */}
      {!compact && (
        <div className="text-xs text-gray-500">
          by{" "}
          <a
            href="https://tipi.zone/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {TALKPOINT_LABEL}
          </a>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  todayData,
  onMethodologyClick,
  filterProps,
  viewMode,
  onViewModeChange,
  signalMode,
  consensusAvailable = false,
  yourScoreAvailable = false,
  onOpenWeights,
}) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, drawerOpen);

  const stats = useSidebarStats(todayData, signalMode);

  return (
    <>
      {/* Desktop: Fixed sidebar */}
      <aside
        role="complementary"
        aria-label={t("app.header.subtitle")}
        className="hidden md:block fixed top-0 inset-inline-start-0 w-[260px] h-screen bg-gray-950 border-e border-gray-800 overflow-y-scroll z-30"
      >
        <SidebarContent
          stats={stats}
          t={t}
          onMethodologyClick={onMethodologyClick}
          filterProps={filterProps}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
          signalMode={signalMode}
          consensusAvailable={consensusAvailable}
          yourScoreAvailable={yourScoreAvailable}
          onOpenWeights={onOpenWeights}
        />
      </aside>

      {/* Mobile: Top stats bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-top))] bg-gray-950 border-b border-gray-800 z-30 flex items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <img
              src="/politymarket-mark.svg"
              alt="PolityMarket logo"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-sm font-bold text-white truncate">PolityMarket</span>
          <div className="ms-1 md:ms-2">
            <QuickAbout onOpenFullMethodology={onMethodologyClick} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-end">
            <div className="text-sm font-black" style={{ color: scoreToColor(stats.weightedAvg) }}>
              {stats.weightedAvg.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-500 leading-none truncate max-w-[80px]">
              {signalMode === "consensus_proxy"
                ? t("signals.consensusProxy")
                : t("signals.mediaClimate")}
            </div>
          </div>
          <LanguageToggle />
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
            aria-label={t("sidebar.openDrawer")}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile: Drawer overlay */}
      {drawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            ref={drawerRef}
            className="md:hidden fixed top-0 inset-inline-start-0 w-[min(280px,85vw)] h-screen bg-gray-950 border-e border-gray-800 overflow-y-auto z-50"
          >
            <div className="flex justify-end p-3">
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"
                aria-label={t("sidebar.closeDrawer")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent
              stats={stats}
              t={t}
              onMethodologyClick={onMethodologyClick}
              filterProps={filterProps}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              signalMode={signalMode}
              consensusAvailable={consensusAvailable}
              yourScoreAvailable={yourScoreAvailable}
              onOpenWeights={() => {
                setDrawerOpen(false);
                onOpenWeights?.();
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
