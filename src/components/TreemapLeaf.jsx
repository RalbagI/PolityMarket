import { ChevronRight } from "lucide-react";
import Sparkline from "./Sparkline";
import { resolveSignalDelta, resolveSignalDisplayScore } from "../lib/signalMode";

export default function TreemapLeaf({
  leaf,
  displayName,
  isHovered,
  isSelected,
  onClick,
  onKeyDown,
  onTouchEnd,
  onMouseEnter,
  backgroundColor,
  signalMode,
  lens = "market",
}) {
  const d = leaf.data;
  const w = leaf.x1 - leaf.x0;
  const h = leaf.y1 - leaf.y0;

  const resolveDisplayMetric = () => {
    if (lens === "your_score") {
      const yourScore = Number(d?.your_score);
      return Number.isFinite(yourScore) ? yourScore * 10 : null;
    }
    return resolveSignalDisplayScore(d, signalMode);
  };

  const area = w * h;
  const sqrtArea = Math.sqrt(area);

  const tooSmall = area < 200;
  const pad = Math.max(2, sqrtArea / 25) * 2;
  const availW = w - pad;
  const availH = h - pad;

  // Three-tier display: name+score (large), name-only (medium), initials (small)
  const displayScoreRaw = resolveDisplayMetric();
  const displayScore = Number.isFinite(displayScoreRaw) ? Math.round(displayScoreRaw) : null;
  const showScore = !d._isOthers && !tooSmall && area > 1200 && h > 18 && displayScore != null;
  const baseNameFontSize = Math.min(24, Math.max(0, sqrtArea / (showScore ? 4.5 : 4.0)));
  const scoreFontSize = Math.min(24, baseNameFontSize * 1.1);
  const scoreLineH = showScore ? scoreFontSize * 1.2 : 0;
  const deltaValue = resolveSignalDelta(d, signalMode) ?? d.delta;

  const nameAvailH = availH - scoreLineH;
  const roughMaxLines = Math.max(1, Math.floor(nameAvailH / (baseNameFontSize * 1.2 || 1)));
  const nameFontSize = (() => {
    if (baseNameFontSize < 1) return 0;
    const charW = 0.7;
    const charsPerLine = availW / (baseNameFontSize * charW) || 1;
    const totalChars = charsPerLine * roughMaxLines;
    const nameLen = displayName.length;
    if (nameLen <= totalChars) return baseNameFontSize;
    return Math.max(baseNameFontSize * 0.65, baseNameFontSize * (totalChars / nameLen));
  })();

  const actualLineH = nameFontSize * 1.2;
  const maxLines = Math.max(1, Math.floor(nameAvailH / (actualLineH || 1)));

  const showInitials = !tooSmall && area < 500 && nameFontSize < 3.5;
  const showName = !tooSmall && !showInitials && nameFontSize >= 3.5;
  const initials = displayName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  const showDelta = !tooSmall && Number.isFinite(deltaValue) && deltaValue !== 0;
  const deltaFontSize = Math.max(7, Math.min(11, sqrtArea / 8));

  // Sparkline + compact score chip for the redesigned medium/large tile layout.
  // Visible on both lenses when the tile has room; falls back silently when not.
  const scoreSeries = Array.isArray(d.scoreSeries14d) ? d.scoreSeries14d : null;
  const hasSpark = !d._isOthers && scoreSeries && scoreSeries.length >= 2;
  const canShowSpark = hasSpark && !tooSmall && area > 2000 && w > 60 && h > 44;
  const sparkW = Math.min(Math.max(40, w - pad * 2), 120);
  const sparkH = Math.min(Math.max(14, h * 0.22), 26);
  const isVolatile = !d._isOthers && d.is_volatile === true;
  const showPulse = isVolatile && !tooSmall && area > 900;

  return (
    <div
      role="button"
      tabIndex={tooSmall ? -1 : 0}
      aria-label={
        d._isOthers || displayScore == null ? displayName : `${displayName}: ${displayScore}`
      }
      onClick={onClick}
      onKeyDown={onKeyDown}
      onTouchEnd={onTouchEnd}
      onMouseEnter={onMouseEnter}
      className="group absolute overflow-hidden cursor-pointer transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950 focus:outline-none"
      style={{
        left: leaf.x0,
        top: leaf.y0,
        width: w,
        height: h,
        background: `linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 28%, rgba(2,6,23,0.22) 100%), ${backgroundColor}`,
        border:
          isHovered || isSelected
            ? "2px solid rgba(255,255,255,0.8)"
            : "1px solid rgba(255,255,255,0.16)",
        borderRadius: 8,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -18px 28px rgba(2,6,23,0.16), 0 12px 32px rgba(2,6,23,0.12)",
      }}
    >
      {/* Delta badge — absolute positioned, doesn't affect name/score layout */}
      {showDelta && (
        <div
          dir="ltr"
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            padding: "2px 5px",
            borderRadius: 999,
            background: "rgba(2, 6, 23, 0.26)",
            fontSize: deltaFontSize,
            fontWeight: 700,
            color: deltaValue > 0 ? "#6ee7b7" : "#fda4af",
            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          {deltaValue > 0 ? `▲${deltaValue.toFixed(1)}` : `▼${Math.abs(deltaValue).toFixed(1)}`}
        </div>
      )}

      {/* Pulse badge — single undirected dot for volatile politicians.
          Tile color already carries direction, this just says "look here". */}
      {showPulse && (
        <div
          aria-label="volatile"
          className="treemap-pulse"
          style={{
            position: "absolute",
            top: 4,
            insetInlineEnd: 4,
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#fcd34d",
            boxShadow: "0 0 0 2px rgba(2,6,23,0.45), 0 0 10px rgba(252,211,77,0.9)",
            zIndex: 2,
          }}
        />
      )}

      {/* Drill-down affordance — subtle chevron for interactive tiles */}
      {!d._isOthers && !tooSmall && area > 3000 && (
        <div
          className="absolute bottom-1 start-1 opacity-0 group-hover:opacity-40 transition-opacity duration-200 treemap-drilldown-chevron"
          aria-hidden="true"
        >
          <ChevronRight className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {showInitials && (
        <div className="w-full h-full flex items-center justify-center">
          <span
            className="font-bold text-white/80"
            style={{
              fontSize: Math.max(8, Math.min(14, sqrtArea / 4)),
              textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            }}
          >
            {initials}
          </span>
        </div>
      )}

      {showName && (
        <div
          className="flex flex-col overflow-hidden"
          style={{
            padding: Math.max(2, sqrtArea / 20),
            height: h,
            boxSizing: "border-box",
          }}
        >
          <div
            className="font-bold text-white leading-tight min-h-0"
            style={{
              fontSize: nameFontSize,
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: "vertical",
              flex: "0 1 auto",
            }}
          >
            {displayName}
          </div>

          {showScore && (
            <div
              className="flex items-end justify-between gap-2"
              dir="ltr"
              style={{ flex: "0 0 auto", marginTop: "auto" }}
            >
              <span
                className="font-black text-white tabular-nums rounded-md px-1.5 py-0.5"
                style={{
                  fontSize: Math.max(10, Math.min(scoreFontSize, sqrtArea / 5.5)),
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  background: "rgba(2, 6, 23, 0.32)",
                  lineHeight: 1,
                }}
              >
                {displayScore}
              </span>
              {canShowSpark && (
                <Sparkline
                  data={scoreSeries}
                  width={sparkW}
                  height={sparkH}
                  color={lens === "momentum" ? "#ffffff" : undefined}
                  className="opacity-90"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
