import { memo, useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import {
  deltaToColorWithAlpha,
  normalizedScoreToColorWithAlpha,
  scoreToColorWithAlpha,
} from "../lib/colorScale";
import { resolveSignalDisplayScore } from "../lib/signalMode";
import { localizeName } from "../lib/localize";
import useStore from "../store";
import useTreemapGestures from "../lib/useTreemapGestures";
import TreemapTooltip from "./TreemapTooltip";
import TreemapLeaf from "./TreemapLeaf";

export default memo(function Treemap({ data, onSelect, selectedPolitician, signalMode }) {
  const { t, i18n } = useTranslation();
  const lens = useStore((s) => s.treemapLens);
  const sizeBy = useStore((s) => s.treemapSizeBy);
  const colorBy = useStore((s) => s.treemapColorBy);
  const isMomentum = lens === "momentum";
  const isYourScore = lens === "your_score";

  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const innerRef = useRef(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [drillDown, setDrillDown] = useState(null);

  const { scale, setScale, resetZoom, isGestureActive } = useTreemapGestures({
    scrollRef,
    innerRef,
    size,
  });

  const virtualW = size.width * scale;
  const virtualH = size.height * scale;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setSize({ width: el.offsetWidth, height: el.offsetHeight });

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isMobile = size.width > 0 && size.width < 640;
  const minBlockArea = isMobile ? 2400 : 1200;

  const sizeValue = useCallback(
    (entry) => {
      if (isMomentum) {
        // In momentum lens, size is proportional to interest_score but floored so
        // nobody disappears entirely. interest_score is a z-score and can be
        // negative — shift into [0.2, ∞) via exp.
        const z = Number.isFinite(entry?.interest_score) ? entry.interest_score : 0;
        return Math.max(0.2, Math.exp(z * 0.6));
      }
      if (isYourScore) {
        // Size proportional to your_score (0-10) with a floor so low-scoring
        // politicians remain visible. Fall back to media_volume when the entry
        // has no dimensional data.
        const ys = Number(entry?.your_score);
        if (Number.isFinite(ys)) return Math.max(0.2, ys);
        const vol = Number(entry?.media_volume);
        return Number.isFinite(vol) && vol > 0 ? vol : 0.5;
      }
      const normalized = sizeBy === "market_score" ? entry.normalizedScore : entry.normalizedVolume;
      if (typeof normalized === "number" && Number.isFinite(normalized)) {
        return Math.sqrt(Math.max(normalized, 0.15));
      }
      const raw = entry[sizeBy];
      if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.sqrt(raw);
      return 1;
    },
    [isMomentum, isYourScore, sizeBy]
  );

  const treemapItems = useMemo(() => {
    if (drillDown && drillDown.sourceData === data) return drillDown.items;
    if (!data || !data.length || size.width === 0 || size.height === 0) return [];
    if (!isMobile || data.length <= 12) return data;

    const sorted = [...data].sort((a, b) => sizeValue(b) - sizeValue(a));
    const totalValue = sorted.reduce((sum, entry) => sum + sizeValue(entry), 0);
    const containerArea = size.width * size.height;

    let accumulated = 0;
    let cutoff = sorted.length;

    for (let i = 0; i < sorted.length; i++) {
      accumulated += sizeValue(sorted[i]);
      const itemArea = (accumulated / totalValue) * containerArea;
      const avgBlockArea = itemArea / (i + 1);
      if (i >= 8 && avgBlockArea < minBlockArea) {
        cutoff = i;
        break;
      }
    }

    const visible = sorted.slice(0, cutoff);
    const grouped = sorted.slice(cutoff);
    if (grouped.length === 0) return visible;

    const smallestVisible = visible[visible.length - 1];
    const othersSize = sizeValue(smallestVisible);
    const othersScore =
      grouped.reduce((sum, entry) => sum + (resolveSignalDisplayScore(entry, signalMode) ?? 0), 0) /
      grouped.length;

    return [
      ...visible,
      {
        politician_id: "__others__",
        name: "__others__",
        displayName: t("treemap.others", { count: grouped.length }),
        party: "",
        overall_score: othersScore,
        market_score: othersScore,
        media_volume: othersSize,
        normalizedScore: othersSize,
        normalizedVolume: othersSize,
        _isOthers: true,
        _groupedNames: grouped.map((entry) => entry.displayName || entry.name),
        _groupedData: grouped,
      },
    ];
  }, [data, size.width, size.height, sizeValue, isMobile, minBlockArea, t, drillDown, signalMode]);

  const leaves = useMemo(() => {
    if (!treemapItems.length || virtualW === 0 || virtualH === 0) return [];

    try {
      const root = hierarchy({ children: treemapItems })
        .sum((entry) => sizeValue(entry))
        .sort((a, b) => b.value - a.value);

      treemap()
        .size([virtualW, virtualH])
        .padding(2 * scale)
        .tile(treemapSquarify)(root);

      return root.leaves();
    } catch {
      return [];
    }
  }, [treemapItems, virtualW, virtualH, sizeValue, scale]);

  const getColorMetric = useCallback(
    (entry) => {
      const value = entry?.[colorBy];
      if (typeof value === "number" && Number.isFinite(value)) return value;
      return resolveSignalDisplayScore(entry, signalMode) ?? 0;
    },
    [colorBy, signalMode]
  );

  const colorRange = useMemo(() => {
    // Only the "market" lens with a non-market_score colorBy consumes this
    // range; momentum and your_score branch away before reading it.
    if (isMomentum || isYourScore || !treemapItems.length) return { min: 0, max: 1 };
    const scores = treemapItems.filter((entry) => !entry._isOthers).map(getColorMetric);
    return {
      min: Math.min(...scores),
      max: Math.max(...scores),
    };
  }, [isMomentum, isYourScore, treemapItems, getColorMetric]);

  // Per-scene scale for the momentum delta color: use the max |delta| in the
  // visible set so the brightest red/green always get used. Min floor of 2
  // keeps tiny deltas visually neutral on quiet days.
  const deltaMaxAbs = useMemo(() => {
    if (!isMomentum || !treemapItems.length) return 5;
    const abs = treemapItems
      .filter((e) => !e._isOthers)
      .map((e) => Math.abs(Number(e.market_delta_points) || 0));
    return Math.max(2, ...abs);
  }, [isMomentum, treemapItems]);

  const isTouchRef = useRef(false);

  const handleMouseMove = useCallback(
    (event) => {
      if (hovered) setMousePos({ x: event.clientX, y: event.clientY });
    },
    [hovered]
  );

  const handleTouchEnd = useCallback(
    (name, event) => {
      if (isGestureActive(event.nativeEvent)) return;
      isTouchRef.current = true;
      event.preventDefault();
      onSelect(name);
      setHovered(null);
    },
    [isGestureActive, onSelect]
  );

  if (!data || !data.length) {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">{t("filterBar.noResults")}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {scale > 1 && (
        <button
          onClick={() => resetZoom(true)}
          className="absolute top-2 left-2 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
        >
          {scale.toFixed(1)}x — {t("treemap.resetZoom", "לחץ לאיפוס")}
        </button>
      )}

      {drillDown && (
        <button
          onClick={() => {
            setDrillDown(null);
            setScale(1);
          }}
          className="absolute top-2 right-2 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm"
        >
          ← {t("treemap.backToAll", "חזרה לכולם")}
        </button>
      )}

      <div
        ref={scrollRef}
        dir="ltr"
        role="img"
        aria-label={t("treemap.ariaLabel")}
        className={`w-full h-full ${scale > 1 ? "overflow-auto" : "overflow-hidden"}`}
        style={{ touchAction: scale > 1 ? "pan-x pan-y" : "pan-y" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onTouchEnd={(event) => {
          if (event.target === scrollRef.current) setHovered(null);
        }}
      >
        <div
          ref={innerRef}
          className="relative"
          dir={i18n.dir()}
          style={{ width: virtualW, height: virtualH }}
        >
          {leaves.map((leaf) => {
            const entry = leaf.data;
            const isHovered = hovered === entry.name;
            const isSelected = selectedPolitician === entry.name;
            const displayName = entry.displayName || localizeName(t, entry.name);

            return (
              <TreemapLeaf
                key={entry.politician_id || entry.name}
                leaf={leaf}
                displayName={displayName}
                isHovered={isHovered}
                isSelected={isSelected}
                backgroundColor={
                  isMomentum
                    ? deltaToColorWithAlpha(
                        Number(entry.market_delta_points) || 0,
                        deltaMaxAbs,
                        isHovered || isSelected ? 0.96 : 0.8
                      )
                    : isYourScore
                      ? scoreToColorWithAlpha(
                          (Number(entry.your_score) || 0) * 10,
                          isHovered || isSelected ? 0.96 : 0.82
                        )
                      : colorBy === "market_score"
                        ? scoreToColorWithAlpha(
                            resolveSignalDisplayScore(entry, signalMode) ?? 50,
                            isHovered || isSelected ? 0.96 : 0.78
                          )
                        : normalizedScoreToColorWithAlpha(
                            getColorMetric(entry),
                            colorRange.min,
                            colorRange.max,
                            isHovered || isSelected ? 0.92 : 0.72
                          )
                }
                lens={lens}
                onClick={() => {
                  if (isGestureActive()) return;
                  if (entry._isOthers && entry._groupedData) {
                    setDrillDown({ items: entry._groupedData, sourceData: data });
                    setScale(1);
                  } else if (!entry._isOthers) {
                    onSelect(entry.name);
                  }
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !entry._isOthers) {
                    event.preventDefault();
                    onSelect(entry.name);
                  }
                }}
                onTouchEnd={(event) => {
                  if (isGestureActive(event.nativeEvent)) return;
                  if (entry._isOthers && entry._groupedData) {
                    event.preventDefault();
                    setDrillDown({ items: entry._groupedData, sourceData: data });
                    setScale(1);
                  } else if (!entry._isOthers) {
                    handleTouchEnd(entry.name, event);
                  }
                }}
                onMouseEnter={() => {
                  if (!isTouchRef.current) setHovered(entry.name);
                  isTouchRef.current = false;
                }}
                signalMode={signalMode}
              />
            );
          })}
        </div>
      </div>

      {hovered && (
        <TreemapTooltip
          politician={data.find((entry) => entry.name === hovered)}
          position={mousePos}
          signalMode={signalMode}
          lens={lens}
        />
      )}
    </div>
  );
});
