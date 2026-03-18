import { memo, useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { scoreToColorWithAlpha } from "../lib/colorScale";
import { localizeName } from "../lib/localize";
import TreemapTooltip from "./TreemapTooltip";

export default memo(function Treemap({ data, onSelect, selectedPolitician }) {
  const { t } = useTranslation();
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

  // Compute treemap layout
  const leaves = useMemo(() => {
    if (!data.length || size.width === 0 || size.height === 0) return [];

    const root = hierarchy({ children: data })
      .sum((d) => Math.max(d.media_volume || 1, 1))
      .sort((a, b) => b.value - a.value);

    treemap().size([size.width, size.height]).padding(3).tile(treemapSquarify)(root);

    return root.leaves();
  }, [data, size.width, size.height]);

  const handleMouseMove = useCallback(
    (e) => {
      if (hovered) setMousePos({ x: e.clientX, y: e.clientY });
    },
    [hovered]
  );

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={t("treemap.ariaLabel")}
      className="w-full h-full relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      {leaves.map((leaf) => {
        const d = leaf.data;
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        const isHovered = hovered === d.name;
        const isSelected = selectedPolitician === d.name;
        const fontSize = Math.min(14, Math.max(9, Math.min(w / 7, h / 3)));
        const showScore = w > 55 && h > 35;
        const showParty = w > 80 && h > 50;

        return (
          <div
            key={d.politician_id || d.name}
            role="button"
            tabIndex={0}
            aria-label={`${localizeName(t, d.name)}: ${d.overall_score.toFixed(1)}/10`}
            onClick={() => onSelect(d.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(d.name);
              }
            }}
            onMouseEnter={() => setHovered(d.name)}
            className="absolute overflow-hidden cursor-pointer transition-opacity duration-150 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950 focus:outline-none"
            style={{
              left: leaf.x0,
              top: leaf.y0,
              width: w,
              height: h,
              backgroundColor: scoreToColorWithAlpha(
                d.overall_score,
                isHovered || isSelected ? 0.85 : 0.55
              ),
              border:
                isHovered || isSelected
                  ? "2px solid rgba(255,255,255,0.8)"
                  : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
            }}
          >
            <div className="p-1.5 h-full flex flex-col justify-between overflow-hidden">
              <div
                className="font-bold text-white leading-tight"
                style={{
                  fontSize,
                  textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: w < 100 ? "nowrap" : "normal",
                }}
              >
                {localizeName(t, d.name)}
              </div>
              {showScore && (
                <div className="flex items-end justify-between">
                  <span
                    className="font-black text-white"
                    style={{
                      fontSize: fontSize * 1.2,
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    {d.overall_score.toFixed(1)}
                  </span>
                  {showParty && (
                    <span
                      className="text-white/60 truncate"
                      style={{ fontSize: Math.max(8, fontSize - 2) }}
                    >
                      /10
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {hovered && (
        <TreemapTooltip politician={data.find((d) => d.name === hovered)} position={mousePos} />
      )}
    </div>
  );
});
