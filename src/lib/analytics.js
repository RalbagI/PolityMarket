/**
 * Lightweight Google Analytics wrapper.
 * Uses the global gtag() function loaded via the script tag in index.html.
 * No npm dependency — zero bundle size impact.
 */

/**
 * Log a custom event to Google Analytics.
 * No-ops when gtag is unavailable (dev/test environments).
 *
 * @param {string} eventName - GA4 event name (e.g. "select_politician")
 * @param {Object} [params] - Event parameters
 */
export function logEvent(eventName, params) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}
