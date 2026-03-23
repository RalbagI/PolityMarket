import { scaleLinear } from "d3-scale";

/**
 * Maps overall_score (0-10) to a color gradient:
 * Red (bad) → Orange → Yellow → Green → Teal (good)
 *
 * d3-scale returns rgb() strings when interpolating hex colors.
 */
const colorScale = scaleLinear()
  .domain([0, 2.5, 5, 7.5, 10])
  .range(["#dc2626", "#f59e0b", "#eab308", "#22c55e", "#0d9488"])
  .clamp(true);

export function scoreToColor(score) {
  return colorScale(score);
}

/**
 * Normalize score relative to [min, max] into the 0-10 color scale domain.
 * When min/max are invalid or equal, use midpoint color to avoid misleading red.
 */
function normalizeScore(score, min, max) {
  const minValid = Number.isFinite(min);
  const maxValid = Number.isFinite(max);
  const scoreValid = Number.isFinite(score);

  if (!minValid || !maxValid || !scoreValid || min === max) return 5;
  return ((score - min) / (max - min)) * 10;
}

export function normalizedScoreToColor(score, min, max) {
  return colorScale(normalizeScore(score, min, max));
}

export function normalizedScoreToColorWithAlpha(score, min, max, alpha = 0.6) {
  return scoreToColorWithAlpha(normalizeScore(score, min, max), alpha);
}

/**
 * Parse the rgb() string from d3 and return rgba() with alpha.
 */
export function scoreToColorWithAlpha(score, alpha = 0.6) {
  const color = colorScale(score);
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
