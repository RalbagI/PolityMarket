import { memo, useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { normalizedScoreToColorWithAlpha } from "../lib/colorScale";
import { localizeName } from "../lib/localize";
import useStore from "../store";
import TreemapTooltip from "./TreemapTooltip";

export default memo(function Treemap({ data, onSelect, selectedPolitician }) {
  const { t } = useTranslation();
  const sizeBy = useStore((s) => s.treemapSizeBy);
  const colorBy = useStore((s) => s.treemapColorBy);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Track container size — measure immediately + observe resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Measure immediately
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // On mobile, group low-volume politicians into an "Others" bucket
  // so remaining blocks are large enough to show names
  const isMobile = size.width > 0 && size.width < 640;
  const minBlockArea = isMobile ? 2400 : 800;

  const treemapItems = useMemo(() => {
    if (!data || !data.length || size.width === 0 || size.height === 0) return [];

    if (!isMobile || data.length <= 12) return data;

    // Sort by sizeBy metric descending — keep top items that fill ~85% of area
    const sorted = [...data].sort(
      (a, b) => (b[sizeBy] || b.media_volume || 1) - (a[sizeBy] || a.media_volume || 1)
    );
    const totalValue = sorted.reduce(
      (s, d) => s + Math.max(d[sizeBy] || d.media_volume || 1, 1),
      0
    );
    const containerArea = size.width * size.height;
    let accumulated = 0;
    let cutoff = sorted.length;

    for (let i = 0; i < sorted.length; i++) {
      accumulated += Math.max(sorted[i][sizeBy] || sorted[i].media_volume || 1, 1);
      const itemArea = (accumulated / totalValue) * containerArea;
      const avgBlockArea = itemArea / (i + 1);
      // Stop when average block area drops below threshold
      if (i >= 8 && avgBlockArea < minBlockArea) {
        cutoff = i;
        break;
      }
    }

    const visible = sorted.slice(0, cutoff);
    const grouped = sorted.slice(cutoff);

    if (grouped.length === 0) return visible;

    // Create an "Others" entry sized like the smallest visible block (not the sum)
    const smallestVisible = visible[visible.length - 1];
    const othersValue = Math.max(
      smallestVisible?.[sizeBy] || smallestVisible?.media_volume || 1,
      1
    );
    const othersScore = grouped.reduce((s, d) => s + d.overall_score, 0) / grouped.length;

    return [
      ...visible,
      {
        politician_id: "__others__",
        name: "__others__",
        displayName: t("treemap.others", { count: grouped.length }),
        party: "",
        overall_score: othersScore,
        media_volume: othersValue,
        [sizeBy]: othersValue,
        _isOthers: true,
        _groupedNames: grouped.map((d) => d.displayName || d.name),
      },
    ];
  }, [data, size.width, size.height, sizeBy, isMobile, minBlockArea, t]);

  // Compute treemap layout
  const leaves = useMemo(() => {
    if (!treemapItems.length || size.width === 0 || size.height === 0) return [];

    try {
      const root = hierarchy({ children: treemapItems })
        .sum((d) => Math.max(d[sizeBy] || d.media_volume || 1, 1))
        .sort((a, b) => b.value - a.value);

      treemap().size([size.width, size.height]).padding(2).tile(treemapSquarify)(root);

      return root.leaves();
    } catch {
      return [];
    }
  }, [treemapItems, size.width, size.height, sizeBy]);

  const getColorMetric = useCallback(
    (entry) => {
      const value = entry?.[colorBy];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof entry?.overall_score === "number" && Number.isFinite(entry.overall_score)) {
        return entry.overall_score;
      }
      return 0;
    },
    [colorBy]
  );

  // Compute dynamic color range from visible data so lowest=red, highest=green
  const colorRange = useMemo(() => {
    if (!treemapItems.length) return { min: 0, max: 10 };
    const scores = treemapItems.filter((d) => !d._isOthers).map(getColorMetric);
    return {
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  }, [treemapItems, getColorMetric]);

  const isTouchRef = useRef(false);

  const handleMouseMove = useCallback(
    (e) => {
      if (hovered) setMousePos({ x: e.clientX, y: e.clientY });
    },
    [hovered]
  );

  // Mobile: single tap opens detail panel directly (no hover on touch devices)
  const handleTouchEnd = useCallback(
    (name, e) => {
      isTouchRef.current = true;
      e.preventDefault();
      onSelect(name);
      setHovered(null);
    },
    [onSelect]
  );

  if (!data || !data.length) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">{t("filterBar.noResults")}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={t("treemap.ariaLabel")}
      className="w-full h-full relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
      onTouchEnd={(e) => {
        // Tap on container background dismisses tooltip
        if (e.target === containerRef.current) setHovered(null);
      }}
    >
      {leaves.map((leaf) => {
        const d = leaf.data;
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        const isHovered = hovered === d.name;
        const isSelected = selectedPolitician === d.name;

        // Area-based font scaling: sqrt(area) gives proportional sizing
        const area = w * h;
        const sqrtArea = Math.sqrt(area);
        // Scale: tiny blocks (area<1000) get 0, large blocks get up to 24px
        const baseNameFontSize = Math.min(24, Math.max(0, sqrtArea / 5));

        const displayName = d.displayName || localizeName(t, d.name);

        // Gentle font shrink: reduce slightly for long names, never below 70% of base
        const maxLines = h > 60 ? 3 : h > 40 ? 2 : 1;
        const nameFontSize = (() => {
          if (baseNameFontSize < 1) return 0;
          const pad = Math.max(2, sqrtArea / 20) * 2;
          const availW = w - pad;
          const charsPerLine = availW / (baseNameFontSize * 0.7) || 1;
          const totalChars = charsPerLine * maxLines;
          const nameLen = displayName.length;
          if (nameLen <= totalChars) return baseNameFontSize;
          // Shrink proportionally but cap at 70% of base
          return Math.max(baseNameFontSize * 0.7, baseNameFontSize * (totalChars / nameLen));
        })();
        const scoreFontSize = Math.min(28, nameFontSize * 1.4);

        // Visibility thresholds based on area
        const tooSmall = area < 400; // truly tiny — show nothing
        const showInitials = !tooSmall && area < 1200 && nameFontSize < 7;
        const showName = !tooSmall && !showInitials && nameFontSize >= 7;
        const showScore = area > 3000 && h > 30;
        const initials = displayName
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2);

        return (
          <div
            key={d.politician_id || d.name}
            role="button"
            tabIndex={tooSmall ? -1 : 0}
            aria-label={
              d._isOthers ? displayName : `${displayName}: ${d.overall_score.toFixed(1)}/10`
            }
            onClick={() => !d._isOthers && onSelect(d.name)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !d._isOthers) {
                e.preventDefault();
                onSelect(d.name);
              }
            }}
            onTouchEnd={(e) => !d._isOthers && handleTouchEnd(d.name, e)}
            onMouseEnter={() => {
              if (!isTouchRef.current) setHovered(d.name);
              isTouchRef.current = false;
            }}
            className="absolute overflow-hidden cursor-pointer transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950 focus:outline-none"
            style={{
              left: leaf.x0,
              top: leaf.y0,
              width: w,
              height: h,
              backgroundColor: normalizedScoreToColorWithAlpha(
                getColorMetric(d),
                colorRange.min,
                colorRange.max,
                isHovered || isSelected ? 0.85 : 0.55
              ),
              border:
                isHovered || isSelected
                  ? "2px solid rgba(255,255,255,0.8)"
                  : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
            }}
          >
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
                className="p-1 h-full flex flex-col justify-between overflow-hidden"
                style={{ padding: Math.max(2, sqrtArea / 20) }}
              >
                <div
                  className="font-bold text-white leading-tight"
                  style={{
                    fontSize: nameFontSize,
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: maxLines,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {displayName}
                </div>
                {showScore && (
                  <div className="flex items-baseline gap-0.5 mt-auto" dir="ltr">
                    <span
                      className="font-black text-white tabular-nums"
                      style={{
                        fontSize: scoreFontSize,
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      }}
                    >
                      {d.overall_score.toFixed(1)}
                    </span>
                    <span
                      className="text-white/50"
                      style={{ fontSize: Math.max(8, nameFontSize * 0.7) }}
                    >
                      /10
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {hovered && (
        <TreemapTooltip politician={data.find((d) => d.name === hovered)} position={mousePos} />
      )}
    </div>
  );
});
