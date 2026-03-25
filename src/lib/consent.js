export const COOKIE_CONSENT_KEY = "politymarket-cookie-consent";

export function hasAnalyticsConsent() {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "accepted" || value === "true";
  } catch {
    return false;
  }
}
