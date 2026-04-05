import { useId, useMemo } from "react";

/**
 * Lightweight SVG sparkline — shows trend shape with no axes/labels.
 * Uses stroke-dashoffset animation for a "draw-in" entrance effect.
 */
export default function Sparkline({ data = [], width = 60, height = 24, color, className = "" }) {
  const gradientId = useId();

  const { points, pathLength, resolvedColor } = useMemo(() => {
    const valid = data.filter((v) => Number.isFinite(v));
    if (valid.length < 2) return { points: "", pathLength: 0, resolvedColor: "#6b7280" };

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const padY = 2;
    const innerH = height - padY * 2;

    const pts = valid.map((v, i) => {
      const x = (i / (valid.length - 1)) * width;
      const y = padY + innerH - ((v - min) / range) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // Determine trend color if none provided
    const trend = valid[valid.length - 1] - valid[0];
    const autoColor = trend > 0 ? "#34d399" : trend < 0 ? "#fb7185" : "#6b7280";

    // Approximate path length for dash animation
    let len = 0;
    for (let i = 1; i < valid.length; i++) {
      const dx = (1 / (valid.length - 1)) * width;
      const dy = ((valid[i] - valid[i - 1]) / range) * innerH;
      len += Math.sqrt(dx * dx + dy * dy);
    }

    return {
      points: pts.join(" "),
      pathLength: Math.ceil(len),
      resolvedColor: color || autoColor,
    };
  }, [data, width, height, color]);

  if (!points) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={resolvedColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={resolvedColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area below the line */}
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradientId})`} />
      {/* Sparkline */}
      <polyline
        points={points}
        fill="none"
        stroke={resolvedColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLength}
        strokeDashoffset={pathLength}
        style={{
          animation: `sparkline-draw 0.6s ease-out 0.1s forwards`,
        }}
      />
    </svg>
  );
}
