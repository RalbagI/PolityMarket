import { hasAnalyticsConsent } from "./consent";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GTAG_SCRIPT_ID = "politymarket-ga-script";

let analyticsInitialized = false;

function hasMeasurementId() {
  return typeof GA_MEASUREMENT_ID === "string" && GA_MEASUREMENT_ID.trim().length > 0;
}

function canTrack() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    hasMeasurementId() &&
    hasAnalyticsConsent()
  );
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = (...args) => {
      window.dataLayer.push(args);
    };
  }
}

function ensureScriptTag() {
  if (document.getElementById(GTAG_SCRIPT_ID)) {
    return;
  }
  const script = document.createElement("script");
  script.id = GTAG_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function initAnalytics() {
  if (!canTrack() || analyticsInitialized) {
    return false;
  }

  ensureGtagStub();
  ensureScriptTag();
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  analyticsInitialized = true;
  return true;
}

/**
 * Log a custom event to Google Analytics.
 * No-ops unless consent is granted and GA has a configured measurement ID.
 *
 * @param {string} eventName - GA4 event name (e.g. "select_politician")
 * @param {Object} [params] - Event parameters
 */
export function logEvent(eventName, params) {
  if (!canTrack()) {
    return;
  }
  initAnalytics();
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
}
