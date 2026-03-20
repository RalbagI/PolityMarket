import { memo } from "react";
import { useTranslation } from "react-i18next";
import { localizeName, localizeParty } from "../lib/localize";
import { scoreToColor } from "../lib/colorScale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default memo(function TreemapTooltip({ politician, position }) {
  const { t } = useTranslation();
  if (!politician) return null;

  const d = politician;
  const scoreColor = scoreToColor(d.overall_score);
  const scorePct = (d.overall_score / 10) * 100;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 640;
  const tooltipW = isMobile ? 220 : 280;
  const tooltipH = isMobile ? 140 : 160;
  const sidebarW = vw >= 768 ? 260 : 0;

  let x, y;
  if (isMobile) {
    // Center tooltip horizontally, above the tap point
    x = Math.max(8, Math.min(vw - tooltipW - 8, position.x - tooltipW / 2));
    y = position.y - tooltipH - 16;
    if (y < 60) y = position.y + 24; // flip below if too close to top bar
  } else {
    const isRtl = document.documentElement.dir === "rtl";
    const availableW = vw - sidebarW;
    if (isRtl) {
      x = position.x - tooltipW - 10 < 0 ? position.x + 16 : position.x - tooltipW - 10;
    } else {
      x = position.x + tooltipW + 20 > availableW ? position.x - tooltipW - 10 : position.x + 16;
    }
    y = position.y + tooltipH > vh ? vh - tooltipH - 10 : Math.max(10, position.y - 10);
  }

  return (
    <div
      className="fixed z-[100] pointer-events-none bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl p-3 sm:p-4 min-w-[180px] sm:min-w-[220px] max-w-[240px] sm:max-w-[300px]"
      style={{
        left: x,
        top: y,
      }}
    >
      {/* Name + Party */}
      <div className="mb-3">
        <div className="text-sm font-bold text-white">
          {d.displayName || localizeName(t, d.name)}
        </div>
        <div className="text-xs text-gray-400">{d.displayParty || localizeParty(t, d.party)}</div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">{t("treemap.tooltip.score")}</span>
          <span className="font-bold text-white">{d.overall_score.toFixed(1)}/10</span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${scorePct}%`, backgroundColor: scoreColor }}
          />
        </div>
      </div>

      {/* Media Volume */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-gray-400">{t("treemap.tooltip.mediaVolume")}</span>
        <span className="text-white font-medium">{d.media_volume.toFixed(1)}</span>
      </div>

      {/* Delta */}
      {d.delta != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">{t("treemap.tooltip.change")}</span>
          <div
            className="flex items-center gap-1 font-bold"
            style={{ color: d.delta > 0 ? "#4ade80" : d.delta < 0 ? "#f87171" : "#9ca3af" }}
          >
            {d.delta > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : d.delta < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>
              {d.delta > 0 ? "+" : ""}
              {d.delta.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
