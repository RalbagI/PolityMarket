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
 * Parse the rgb() string from d3 and return rgba() with alpha.
 */
/**
 * Normalized color: maps score relative to [min, max] of visible data
 * so the lowest visible score is red and highest is green.
 */
export function normalizedScoreToColor(score, min, max) {
  const range = max - min || 1;
  const normalized = ((score - min) / range) * 10;
  return colorScale(normalized);
}

export function normalizedScoreToColorWithAlpha(score, min, max, alpha = 0.6) {
  const range = max - min || 1;
  const normalized = ((score - min) / range) * 10;
  return scoreToColorWithAlpha(normalized, alpha);
}

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
