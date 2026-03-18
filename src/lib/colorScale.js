import { scaleLinear } from "d3-scale";

/**
 * Maps overall_score (0-10) to a color gradient:
 * Red (bad) → Orange → Yellow → Green → Teal (good)
 */
const colorScale = scaleLinear()
  .domain([0, 2.5, 5, 7.5, 10])
  .range(["#dc2626", "#f59e0b", "#eab308", "#22c55e", "#0d9488"])
  .clamp(true);

export function scoreToColor(score) {
  return colorScale(score);
}

export function scoreToColorWithAlpha(score, alpha = 0.6) {
  const hex = colorScale(score);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
