/**
 * Parse a chain_of_thought string into structured sections.
 * New format uses ## headers; old format is a plain paragraph.
 */
export function parseChainOfThought(text) {
  if (!text) return null;

  if (!/^## /m.test(text)) {
    return { isLegacy: true, raw: text };
  }

  const sections = {};
  const parts = text.split(/^## /m).filter(Boolean);

  for (const part of parts) {
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) continue;
    const title = part.slice(0, newlineIdx).trim();
    const body = part.slice(newlineIdx + 1).trim();

    if (title === "שורה תחתונה") sections.bottomLine = body;
    else if (title === "מה קרה") sections.whatHappened = body;
    else if (title === "מה זה אומר") sections.whatItMeans = body;
  }

  if (!sections.bottomLine && !sections.whatHappened && !sections.whatItMeans) {
    return { isLegacy: true, raw: text };
  }

  return { isLegacy: false, ...sections };
}
