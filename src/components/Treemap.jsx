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
  const innerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Drill-down: when "Others" is tapped, show its children
  const [drillDown, setDrillDown] = useState(null); // null or array of politician data

  // Zoom state — scale=1 means no zoom, x/y is the viewport offset
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const lastTapRef = useRef(0);
  const gestureActiveRef = useRef(false); // suppress clicks during/after gestures

  // Virtual dimensions: treemap renders at zoomed size
  const virtualW = size.width * viewport.scale;
  const virtualH = size.height * viewport.scale;

  // Attach gesture handlers as native events (passive: false to allow preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rect = el.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        gestureActiveRef.current = true;
        pinchRef.current = {
          startDist: dist,
          startScale: viewportRef.current.scale,
          startX: viewportRef.current.x,
          startY: viewportRef.current.y,
          originX: midX + viewportRef.current.x,
          originY: midY + viewportRef.current.y,
        };
        panRef.current = null;
      } else if (e.touches.length === 1 && viewportRef.current.scale > 1) {
        panRef.current = {
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          vpX: viewportRef.current.x,
          vpY: viewportRef.current.y,
          moved: false,
        };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const g = pinchRef.current;
        const newScale = Math.max(1, Math.min(5, g.startScale * (dist / g.startDist)));

        // Zoom towards pinch midpoint: keep the origin point stationary on screen
        const newX = g.originX * (newScale / g.startScale) - (g.originX - g.startX);
        const newY = g.originY * (newScale / g.startScale) - (g.originY - g.startY);

        const s = Math.max(1, Math.min(5, newScale));
        const maxX = el.offsetWidth * (s - 1);
        const maxY = el.offsetHeight * (s - 1);
        const clamped = {
          scale: s,
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY)),
        };

        if (innerRef.current) {
          innerRef.current.style.transform = `translate(${-clamped.x}px, ${-clamped.y}px)`;
        }
        pinchRef.current.live = clamped;
      } else if (e.touches.length === 1 && panRef.current && !pinchRef.current) {
        e.preventDefault();
        const dx = panRef.current.startX - e.touches[0].clientX;
        const dy = panRef.current.startY - e.touches[0].clientY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) panRef.current.moved = true;
        if (panRef.current.moved && innerRef.current) {
          const vp = viewportRef.current;
          const s = vp.scale;
          const maxX = el.offsetWidth * (s - 1);
          const maxY = el.offsetHeight * (s - 1);
          const clamped = {
            scale: s,
            x: Math.max(0, Math.min(maxX, panRef.current.vpX + dx)),
            y: Math.max(0, Math.min(maxY, panRef.current.vpY + dy)),
          };
          innerRef.current.style.transform = `translate(${-clamped.x}px, ${-clamped.y}px)`;
          panRef.current.live = clamped;
        }
      }
    };

    const onTouchEnd = (e) => {
      if (pinchRef.current?.live) {
        setViewport(pinchRef.current.live);
        if (innerRef.current) innerRef.current.style.transform = "";
        pinchRef.current = null;
        setTimeout(() => { gestureActiveRef.current = false; }, 300);
        return;
      }
      if (panRef.current?.live) {
        setViewport(panRef.current.live);
        if (innerRef.current) innerRef.current.style.transform = "";
        panRef.current = null;
        setTimeout(() => { gestureActiveRef.current = false; }, 300);
        return;
      }
      pinchRef.current = null;
      gestureActiveRef.current = false;

      // Double-tap to reset zoom
      if (e.touches.length === 0 && viewportRef.current.scale > 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          setViewport({ scale: 1, x: 0, y: 0 });
          if (innerRef.current) innerRef.current.style.transform = "";
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
      }
    };

    // Wheel/trackpad zoom: Ctrl+scroll or trackpad pinch (fires wheel with ctrlKey)
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const vp = viewportRef.current;
      const zoomFactor = 1 - e.deltaY * 0.01;
      const newScale = Math.max(1, Math.min(5, vp.scale * zoomFactor));

      // Zoom towards cursor: keep the point under cursor stationary
      const pointX = vp.x + mouseX;
      const pointY = vp.y + mouseY;
      const ratio = newScale / vp.scale;
      const newX = pointX * ratio - mouseX;
      const newY = pointY * ratio - mouseY;

      const maxX = el.offsetWidth * (newScale - 1);
      const maxY = el.offsetHeight * (newScale - 1);
      setViewport({
        scale: newScale,
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY)),
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // When drilled into "Others", show those politicians instead
    if (drillDown) return drillDown;

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
        _groupedData: grouped,
      },
    ];
  }, [data, size.width, size.height, sizeBy, isMobile, minBlockArea, t, drillDown]);

  // Compute treemap layout at virtual (zoomed) size
  const leaves = useMemo(() => {
    if (!treemapItems.length || virtualW === 0 || virtualH === 0) return [];

    try {
      const root = hierarchy({ children: treemapItems })
        .sum((d) => Math.max(d[sizeBy] || d.media_volume || 1, 1))
        .sort((a, b) => b.value - a.value);

      treemap().size([virtualW, virtualH]).padding(2 * viewport.scale).tile(treemapSquarify)(root);

      return root.leaves();
    } catch {
      return [];
    }
  }, [treemapItems, virtualW, virtualH, sizeBy, viewport.scale]);

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
      // Don't select if we were pinching or panning
      if (pinchRef.current || panRef.current?.moved) return;
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

  // Reset zoom and drill-down when data changes (e.g. filter)
  useEffect(() => {
    setDrillDown(null);
    setViewport({ scale: 1, x: 0, y: 0 });
    if (innerRef.current) innerRef.current.style.transform = "";
  }, [data]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={t("treemap.ariaLabel")}
      className="w-full h-full relative overflow-hidden"
      style={{ touchAction: viewport.scale > 1 ? "none" : "pan-y" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
      onTouchEnd={(e) => {
        // Tap on container background dismisses tooltip
        if (e.target === containerRef.current) setHovered(null);
      }}
    >
      {viewport.scale > 1 && (
        <button
          onClick={() => {
            setViewport({ scale: 1, x: 0, y: 0 });
            if (innerRef.current) innerRef.current.style.transform = "";
          }}
          className="absolute top-2 left-2 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
        >
          {viewport.scale.toFixed(1)}x — {t("treemap.resetZoom", "tap to reset")}
        </button>
      )}
      {drillDown && (
        <button
          onClick={() => {
            setDrillDown(null);
            setViewport({ scale: 1, x: 0, y: 0 });
            if (innerRef.current) innerRef.current.style.transform = "";
          }}
          className="absolute top-2 right-2 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
        >
          ← {t("treemap.backToAll", "חזרה לכולם")}
        </button>
      )}
      <div
        ref={innerRef}
        className="absolute top-0 left-0"
        style={{
          width: virtualW,
          height: virtualH,
          transform: `translate(${-viewport.x}px, ${-viewport.y}px)`,
          willChange: viewport.scale > 1 ? "transform" : "auto",
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

        const tooSmall = area < 400; // truly tiny — show nothing
        const pad = Math.max(2, sqrtArea / 20) * 2;
        const availW = w - pad;
        const availH = h - pad;

        // Score sizing — show score in all but the tiniest cells
        const showScore = !tooSmall && area > 1200 && h > 20;
        const scoreFontSize = Math.min(28, baseNameFontSize * 1.4);
        const scoreLineH = showScore ? scoreFontSize * 1.3 : 0;
        const showSlashTen = showScore && area > 8000;

        // Step 1: shrink font for long names (using generous initial maxLines estimate)
        const nameAvailH = availH - scoreLineH;
        const roughMaxLines = Math.max(1, Math.floor(nameAvailH / ((baseNameFontSize * 1.2) || 1)));
        const nameFontSize = (() => {
          if (baseNameFontSize < 1) return 0;
          const charW = 0.7; // avg char width / font size for bold Hebrew
          const charsPerLine = availW / (baseNameFontSize * charW) || 1;
          const totalChars = charsPerLine * roughMaxLines;
          const nameLen = displayName.length;
          if (nameLen <= totalChars) return baseNameFontSize;
          return Math.max(baseNameFontSize * 0.55, baseNameFontSize * (totalChars / nameLen));
        })();

        // Step 2: compute maxLines from the ACTUAL shrunken font size so text won't overflow
        const actualLineH = nameFontSize * 1.2;
        const maxLines = Math.max(1, Math.floor(nameAvailH / (actualLineH || 1)));

        // Visibility thresholds based on area
        const showInitials = !tooSmall && area < 1200 && nameFontSize < 5;
        const showName = !tooSmall && !showInitials && nameFontSize >= 5;
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
            onClick={() => {
              if (gestureActiveRef.current) return;
              if (d._isOthers && d._groupedData) {
                setDrillDown(d._groupedData);
                setViewport({ scale: 1, x: 0, y: 0 });
              } else if (!d._isOthers) {
                onSelect(d.name);
              }
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !d._isOthers) {
                e.preventDefault();
                onSelect(d.name);
              }
            }}
            onTouchEnd={(e) => {
              if (pinchRef.current || panRef.current?.moved) return;
              if (d._isOthers && d._groupedData) {
                e.preventDefault();
                setDrillDown(d._groupedData);
                setViewport({ scale: 1, x: 0, y: 0 });
              } else if (!d._isOthers) {
                handleTouchEnd(d.name, e);
              }
            }}
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
                      {d.overall_score.toFixed(1)}
                    </span>
                    {showSlashTen && (
                      <span
                        className="text-white/50"
                        style={{ fontSize: Math.max(8, nameFontSize * 0.7) }}
                      >
                        /10
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      </div>
      {hovered && (
        <TreemapTooltip politician={data.find((d) => d.name === hovered)} position={mousePos} />
      )}
    </div>
  );
});
