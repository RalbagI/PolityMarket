import { resolveDisplayScore } from "../lib/marketScore";

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
}) {
  const d = leaf.data;
  const w = leaf.x1 - leaf.x0;
  const h = leaf.y1 - leaf.y0;

  const area = w * h;
  const sqrtArea = Math.sqrt(area);
  const baseNameFontSize = Math.min(24, Math.max(0, sqrtArea / 5));

  const tooSmall = area < 400;
  const pad = Math.max(2, sqrtArea / 20) * 2;
  const availW = w - pad;
  const availH = h - pad;

  const showScore = !d._isOthers && !tooSmall && area > 1200 && h > 20;
  const scoreFontSize = Math.min(28, baseNameFontSize * 1.4);
  const scoreLineH = showScore ? scoreFontSize * 1.3 : 0;
  const displayScore = resolveDisplayScore(d);
  const deltaValue = Number.isFinite(d.market_delta_points) ? d.market_delta_points : d.delta;

  const nameAvailH = availH - scoreLineH;
  const roughMaxLines = Math.max(1, Math.floor(nameAvailH / (baseNameFontSize * 1.2 || 1)));
  const nameFontSize = (() => {
    if (baseNameFontSize < 1) return 0;
    const charW = 0.7;
    const charsPerLine = availW / (baseNameFontSize * charW) || 1;
    const totalChars = charsPerLine * roughMaxLines;
    const nameLen = displayName.length;
    if (nameLen <= totalChars) return baseNameFontSize;
    return Math.max(baseNameFontSize * 0.55, baseNameFontSize * (totalChars / nameLen));
  })();

  const actualLineH = nameFontSize * 1.2;
  const maxLines = Math.max(1, Math.floor(nameAvailH / (actualLineH || 1)));

  const showInitials = !tooSmall && area < 1200 && nameFontSize < 5;
  const showName = !tooSmall && !showInitials && nameFontSize >= 5;
  const initials = displayName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  const showDelta = !tooSmall && Number.isFinite(deltaValue) && deltaValue !== 0;
  const deltaFontSize = Math.max(7, Math.min(11, sqrtArea / 8));

  return (
    <div
      role="button"
      tabIndex={tooSmall ? -1 : 0}
      aria-label={d._isOthers ? displayName : `${displayName}: ${displayScore}`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onTouchEnd={onTouchEnd}
      onMouseEnter={onMouseEnter}
      className="absolute overflow-hidden cursor-pointer transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950 focus:outline-none"
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
            top: 2,
            left: 2,
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
              className="flex items-baseline gap-0.5"
              dir="ltr"
              style={{ flex: "0 0 auto", marginTop: "auto" }}
            >
              <span
                className="font-black text-white tabular-nums"
                style={{
                  fontSize: scoreFontSize,
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                }}
              >
                {displayScore}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
