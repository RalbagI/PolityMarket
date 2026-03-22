const DIGRAPH_REPLACEMENTS = [
  [/sh/gi, "ש"],
  [/ch/gi, "ח"],
  [/kh/gi, "ח"],
  [/tz/gi, "צ"],
  [/ts/gi, "צ"],
  [/th/gi, "ת"],
  [/ph/gi, "פ"],
  [/qu/gi, "קו"],
  [/ck/gi, "ק"],
  [/ee/gi, "י"],
  [/oo/gi, "ו"],
  [/ou/gi, "או"],
  [/ow/gi, "או"],
  [/ai/gi, "אי"],
  [/ay/gi, "אי"],
  [/ei/gi, "יי"],
  [/ey/gi, "יי"],
  [/oa/gi, "ו"],
  [/ie/gi, "אי"],
];

const LETTER_MAP = {
  a: "א",
  b: "ב",
  c: "ק",
  d: "ד",
  e: "",
  f: "פ",
  g: "ג",
  h: "",
  i: "י",
  j: "ג",
  k: "ק",
  l: "ל",
  m: "מ",
  n: "נ",
  o: "ו",
  p: "פ",
  q: "ק",
  r: "ר",
  s: "ס",
  t: "ט",
  u: "ו",
  v: "ו",
  w: "ו",
  x: "קס",
  y: "י",
  z: "ז",
};

function transliterateLatinWord(word) {
  if (!word) return "";

  let normalized = word.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  for (const [pattern, replacement] of DIGRAPH_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  let result = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (/[’'"`]/u.test(ch)) continue;
    if (ch === "-") {
      result += "-";
      continue;
    }
    if (ch === " ") {
      result += " ";
      continue;
    }
    result += LETTER_MAP[ch] ?? ch;
  }

  return result.replace(/-+/g, "-").replace(/\s+/g, " ").trim();
}

export function transliterateToHebrew(text) {
  return String(text)
    .split(/(\s+|-)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === "-") return part;
      return transliterateLatinWord(part);
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Localize politician and party names using i18n translation keys.
 * Falls back to Hebrew transliteration if no translation exists.
 */
export function localizeName(t, name) {
  const missing = "__missing_politician_name__";
  const translated = t(`politicians.${name}`, { defaultValue: missing });
  return translated === missing ? transliterateToHebrew(name) : translated;
}

export function localizeParty(t, party) {
  return t(`parties.${party}`, { defaultValue: party });
}
