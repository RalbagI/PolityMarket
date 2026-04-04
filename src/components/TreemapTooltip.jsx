import { memo } from "react";
import { useTranslation } from "react-i18next";
import { localizeName, localizeParty } from "../lib/localize";
import { scoreToColor, scoreToColorWithAlpha } from "../lib/colorScale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getMarketTierBadgeClass, getMarketTierLabel } from "../lib/marketScore";

export default memo(function TreemapTooltip({ politician, position }) {
  const { t } = useTranslation();
  if (!politician) return null;

  const d = politician;
  const scoreValue = Number.isFinite(d.market_score) ? d.market_score : (d.overall_score ?? 0) * 10;
  const scoreColor = scoreToColor(scoreValue);
  const scorePct = Number.isFinite(scoreValue) ? scoreValue : 0;
  const chromeColor = scoreToColorWithAlpha(scoreValue, 0.26);
  const glowColor = scoreToColorWithAlpha(scoreValue, 0.18);
  const tierLabel = d.market_tier
    ? t(`market.tiers.${d.market_tier}.label`, {
        defaultValue: getMarketTierLabel(d.market_tier),
      })
    : "";

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
      className="fixed z-[100] pointer-events-none rounded-2xl border p-3 shadow-2xl backdrop-blur-xl sm:p-4 min-w-[180px] sm:min-w-[220px] max-w-[240px] sm:max-w-[300px]"
      style={{
        left: x,
        top: y,
        borderColor: chromeColor,
        background: "linear-gradient(180deg, rgba(17,24,39,0.97) 0%, rgba(2,6,23,0.96) 100%)",
        boxShadow: `0 24px 48px rgba(2,6,23,0.58), 0 0 0 1px ${chromeColor}, 0 0 28px ${glowColor}`,
      }}
    >
      {/* Name + Party */}
      <div className="mb-3">
        <div className="text-sm font-bold text-white">
          {d.displayName || localizeName(t, d.name)}
        </div>
        <div className="text-xs text-gray-400">{d.displayParty || localizeParty(t, d.party)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {d.market_tier && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getMarketTierBadgeClass(d.market_tier)}`}
            >
              {d.market_tier}-Tier
            </span>
          )}
          {Number.isFinite(d.market_percentile) && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-300">
              P{Math.round(d.market_percentile)}
            </span>
          )}
        </div>
        {d.market_tier && <div className="mt-1 text-[10px] text-gray-400">{tierLabel}</div>}
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">{t("treemap.tooltip.score")}</span>
          <span className="font-bold" style={{ color: scoreColor }}>
            {Math.round(scoreValue)}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-950/70">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${scorePct}%`,
              backgroundColor: scoreColor,
              boxShadow: `0 0 14px ${glowColor}`,
            }}
          />
        </div>
      </div>

      {/* Media Volume */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-gray-400">{t("treemap.tooltip.mediaVolume")}</span>
        <span className="text-white font-medium">{d.media_volume.toFixed(1)}</span>
      </div>

      {/* Delta */}
      {d.market_delta_points != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">{t("treemap.tooltip.change")}</span>
          <div
            className="flex items-center gap-1 font-bold"
            style={{
              color:
                d.market_delta_points > 0
                  ? "#4ade80"
                  : d.market_delta_points < 0
                    ? "#f87171"
                    : "#9ca3af",
            }}
          >
            {d.market_delta_points > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : d.market_delta_points < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span>
              {d.market_delta_points > 0 ? "+" : ""}
              {d.market_delta_points.toFixed(1)}
              {d.market_delta_pct != null && (
                <span className="ms-1 text-[10px] text-gray-400">
                  ({d.market_delta_pct > 0 ? "+" : ""}
                  {d.market_delta_pct.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
