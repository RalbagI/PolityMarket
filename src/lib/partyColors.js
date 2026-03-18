/**
 * Hard-coded color mappings for Israeli political parties.
 * Each party gets a distinct, visually differentiated block color.
 * Colors chosen for high contrast on dark backgrounds + WCAG AA compliance.
 */
const PARTY_BLOCK_COLORS = {
  Likud: { bg: "#1e40af", text: "#dbeafe", accent: "#3b82f6" },
  "Yesh Atid": { bg: "#b45309", text: "#fef3c7", accent: "#f59e0b" },
  "National Unity": { bg: "#4338ca", text: "#e0e7ff", accent: "#818cf8" },
  "Religious Zionism": { bg: "#991b1b", text: "#fee2e2", accent: "#f87171" },
  "Yisrael Beiteinu": { bg: "#065f46", text: "#d1fae5", accent: "#34d399" },
  Shas: { bg: "#5b21b6", text: "#ede9fe", accent: "#a78bfa" },
  "Otzma Yehudit": { bg: "#9f1239", text: "#ffe4e6", accent: "#fb7185" },
  "United Torah Judaism": { bg: "#3f3f46", text: "#e4e4e7", accent: "#a1a1aa" },
  Labor: { bg: "#dc2626", text: "#fee2e2", accent: "#fca5a5" },
  "Hadash-Ta'al": { bg: "#0f766e", text: "#ccfbf1", accent: "#5eead4" },
  "Ra'am": { bg: "#15803d", text: "#dcfce7", accent: "#86efac" },
  Democrats: { bg: "#0369a1", text: "#e0f2fe", accent: "#7dd3fc" },
};

const DEFAULT_COLOR = { bg: "#374151", text: "#e5e7eb", accent: "#9ca3af" };

export function getPartyColor(party) {
  return PARTY_BLOCK_COLORS[party] || DEFAULT_COLOR;
}
