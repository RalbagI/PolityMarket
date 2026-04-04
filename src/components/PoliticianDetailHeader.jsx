import { useTranslation } from "react-i18next";
import { Bell, BellOff, Heart, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Avatar from "./Avatar";
import { scoreToColor } from "../lib/colorScale";
import { localizeName, localizeParty } from "../lib/localize";
import {
  getMarketTierBadgeClass,
  getMarketTierLabel,
  resolveDisplayScore,
} from "../lib/marketScore";

export default function PoliticianDetailHeader({
  entry,
  selectedDate,
  isLiked,
  onToggleLike,
  isAlertSubscribed,
  onToggleAlert,
}) {
  const { t } = useTranslation();

  const displayScore = resolveDisplayScore(entry) ?? 0;
  const displayPercentile = Number.isFinite(entry.market_percentile)
    ? Math.round(entry.market_percentile)
    : null;
  const deltaPoints = Number.isFinite(entry.market_delta_points) ? entry.market_delta_points : null;
  const deltaPct = Number.isFinite(entry.market_delta_pct) ? entry.market_delta_pct : null;
  const scoreAccent = scoreToColor(displayScore);
  const tierLabel = entry.market_tier
    ? t(`market.tiers.${entry.market_tier}.label`, {
        defaultValue: getMarketTierLabel(entry.market_tier),
      })
    : "";

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={entry.name} politicianId={entry.politician_id} size={64} />
          <div className="min-w-0">
            <h4 className="truncate text-lg font-bold text-white">{localizeName(t, entry.name)}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                {localizeParty(t, entry.party)}
              </span>
              {entry.market_tier && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getMarketTierBadgeClass(entry.market_tier)}`}
                >
                  {entry.market_tier}-Tier
                </span>
              )}
              {displayPercentile != null && (
                <span className="text-xs font-medium text-gray-400">P{displayPercentile}</span>
              )}
            </div>
            {entry.market_tier && <div className="mt-1 text-xs text-gray-400">{tierLabel}</div>}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-3">
          {onToggleAlert && (
            <button
              onClick={() => onToggleAlert(entry.politician_id || entry.name)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-800"
              aria-label={isAlertSubscribed ? t("alerts.toggleOff") : t("alerts.toggleOn")}
              data-testid="alert-toggle"
            >
              {isAlertSubscribed ? (
                <Bell className="h-6 w-6 fill-amber-400 text-amber-400 transition-colors" />
              ) : (
                <BellOff className="h-6 w-6 text-gray-500 transition-colors hover:text-amber-400" />
              )}
            </button>
          )}

          {onToggleLike && (
            <button
              onClick={() => onToggleLike(entry.politician_id || entry.name)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-800"
              aria-label={isLiked ? t("detailView.unlike") : t("detailView.like")}
            >
              <Heart
                className={`h-6 w-6 transition-colors ${
                  isLiked ? "fill-red-500 text-red-500" : "text-gray-500 hover:text-red-400"
                }`}
              />
            </button>
          )}

          <div className="text-end">
            <div className="text-3xl font-black tabular-nums" style={{ color: scoreAccent }}>
              {displayScore}
            </div>
            {deltaPoints != null && (
              <div
                className={`mt-1 flex items-center justify-end gap-1 text-xs font-semibold ${
                  deltaPoints > 0
                    ? "text-emerald-400"
                    : deltaPoints < 0
                      ? "text-red-400"
                      : "text-gray-400"
                }`}
              >
                {deltaPoints > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : deltaPoints < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                <span>
                  {deltaPoints > 0 ? "+" : ""}
                  {deltaPoints.toFixed(1)}
                  {deltaPct != null && (
                    <span className="ms-1 text-[11px] text-gray-400">
                      ({deltaPct > 0 ? "+" : ""}
                      {deltaPct.toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>
            )}
            <div className="text-xs text-gray-500">
              {selectedDate || t("detailView.date.fallback")}
            </div>
          </div>
        </div>
      </div>

      <div className="-mt-3 text-end text-[10px] text-gray-600">
        {t("detailView.scoreSmoothed")}
      </div>
    </>
  );
}
