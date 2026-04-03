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
import useStore from "../store";

export function DisplayOptions({ t }) {
  const sizeBy = useStore((s) => s.treemapSizeBy);
  const colorBy = useStore((s) => s.treemapColorBy);
  const setSizeBy = useStore((s) => s.setTreemapSizeBy);
  const setColorBy = useStore((s) => s.setTreemapColorBy);

  const options = [
    { value: "media_volume", label: t("treemap.options.mediaVolume") },
    { value: "market_score", label: t("treemap.options.score") },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {t("treemap.options.title")}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-gray-500 mb-1">{t("treemap.options.sizeBy")}</div>
          <div className="flex gap-1">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => setSizeBy(o.value)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
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
        <div>
          <div className="text-[10px] text-gray-500 mb-1">{t("treemap.options.colorBy")}</div>
          <div className="flex gap-1">
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => setColorBy(o.value)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
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
  hideHeader,
}) {
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
          {/* App Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 flex items-center justify-center shrink-0">
                <img
                  src="/politymarket-mark.svg"
                  alt="PolityMarket logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">PolityMarket</h1>
              <div className="ms-1 md:ms-2">
                <QuickAbout onOpenFullMethodology={onMethodologyClick} />
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
              <div className="text-xs text-gray-500">{t("sidebar.weightedAverage")}</div>
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

      {/* Display Options — size/color controls */}
      <DisplayOptions t={t} />

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
        <>
          {/* Color Legend */}
          <div>
            <div
              className="h-2 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #166534, #22c55e, #6b7280, #ef4444, #7f1d1d)",
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-500">{t("sidebar.colorLegend.positive")}</span>
              <span className="text-[10px] text-gray-500">{t("sidebar.colorLegend.negative")}</span>
            </div>
          </div>

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
      )}

      {/* Methodology Link */}
      <button
        onClick={onMethodologyClick}
        className="w-full text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 text-start transition-colors"
      >
        {t("methodology.link")}
      </button>

      {/* TalkPoint attribution */}
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
    </div>
  );
}

export default function Sidebar({
  todayData,
  onMethodologyClick,
  filterProps,
  viewMode,
  onViewModeChange,
}) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, drawerOpen);

  const stats = useSidebarStats(todayData);

  return (
    <>
      {/* Desktop: Fixed sidebar */}
      <aside
        role="complementary"
        aria-label={t("app.header.subtitle")}
        className="hidden md:block fixed top-0 inset-inline-start-0 w-[260px] h-screen bg-gray-950 border-e border-gray-800 overflow-y-auto z-30"
      >
        <SidebarContent
          stats={stats}
          t={t}
          onMethodologyClick={onMethodologyClick}
          filterProps={filterProps}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
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
              {t("sidebar.weightedAverage")}
            </div>
          </div>
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
            />
          </div>
        </>
      )}
    </>
  );
}
