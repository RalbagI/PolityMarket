/**
 * Compute Simple Moving Average over an array of numeric values.
 * Handles nulls gracefully — only averages non-null values in the window.
 *
 * @param {(number|null)[]} values - Input values
 * @param {number} window - Rolling window size (e.g., 7 or 14)
 * @returns {(number|null)[]} SMA values, same length as input
 */
export default function computeSMA(values, window) {
  return values.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1).filter((v) => v != null);
    if (slice.length === 0) return null;
    return parseFloat((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
  });
}
