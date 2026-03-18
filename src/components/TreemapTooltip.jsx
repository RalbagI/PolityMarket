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

  // Clamp tooltip to viewport edges, accounting for sidebar (260px) on desktop
  const tooltipW = 280;
  const tooltipH = 160;
  const isRtl = document.documentElement.dir === "rtl";
  const sidebarW = window.innerWidth >= 768 ? 260 : 0;
  const availableW = window.innerWidth - sidebarW;

  // In RTL, sidebar is on the right — available space is on the left
  let x;
  if (isRtl) {
    x = position.x - tooltipW - 10 < 0 ? position.x + 16 : position.x - tooltipW - 10;
  } else {
    x = position.x + tooltipW + 20 > availableW ? position.x - tooltipW - 10 : position.x + 16;
  }
  const y =
    position.y + tooltipH > window.innerHeight
      ? window.innerHeight - tooltipH - 10
      : Math.max(10, position.y - 10);

  return (
    <div
      className="fixed z-[100] pointer-events-none bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl p-4 min-w-[220px] max-w-[300px]"
      style={{
        left: x,
        top: y,
      }}
    >
      {/* Name + Party */}
      <div className="mb-3">
        <div className="text-sm font-bold text-white">{localizeName(t, d.name)}</div>
        <div className="text-xs text-gray-400">{localizeParty(t, d.party)}</div>
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
