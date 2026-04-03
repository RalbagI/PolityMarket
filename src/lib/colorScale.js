import { scaleLinear } from "d3-scale";

/**
 * Maps market_score (0-100) to a tier-centered color gradient.
 */
const marketColorScale = scaleLinear()
  .domain([0, 35, 50, 65, 85, 100])
  .range(["#7f1d1d", "#ef4444", "#6b7280", "#86efac", "#22c55e", "#166534"])
  .clamp(true);

const relativeMetricScale = scaleLinear()
  .domain([0, 0.5, 1])
  .range(["#374151", "#475569", "#60a5fa"])
  .clamp(true);

/**
 * Normalize a relative metric into 0-1 for local min/max visual encoding.
 */
function normalizeScore(score, min, max) {
  const minValid = Number.isFinite(min);
  const maxValid = Number.isFinite(max);
  const scoreValid = Number.isFinite(score);

  if (!minValid || !maxValid || !scoreValid || min === max) return 0.5;
  return (score - min) / (max - min);
}

function colorToRgba(color, alpha) {
  // d3 returns "rgb(r, g, b)" format
  const match = String(color).match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match) {
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }
  // Fallback: try hex
  if (typeof color === "string" && color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(107, 114, 128, ${alpha})`;
}

export function scoreToColor(score) {
  return marketColorScale(score);
}

export function normalizedScoreToColor(score, min, max) {
  return relativeMetricScale(normalizeScore(score, min, max));
}

export function normalizedScoreToColorWithAlpha(score, min, max, alpha = 0.6) {
  return colorToRgba(normalizedScoreToColor(score, min, max), alpha);
}

/**
 * Parse the rgb() string from d3 and return rgba() with alpha.
 */
export function scoreToColorWithAlpha(score, alpha = 0.6) {
  return colorToRgba(scoreToColor(score), alpha);
}
