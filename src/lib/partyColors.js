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
};

const DEFAULT_COLOR = { bg: "#374151", text: "#e5e7eb", accent: "#9ca3af" };

export function getPartyColor(party) {
  return PARTY_BLOCK_COLORS[party] || DEFAULT_COLOR;
}
