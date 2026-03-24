import bennett2026 from "./politicianTraits/parties/bennett-2026.json";
import blueAndWhite from "./politicianTraits/parties/blue-and-white.json";
import democrats from "./politicianTraits/parties/democrats.json";
import elHaDegel from "./politicianTraits/parties/el-hadegel.json";
import hadashTaal from "./politicianTraits/parties/hadash-taal.json";
import haMiluimnikim from "./politicianTraits/parties/hamiluimnikim.json";
import haYaminHaMamlakhti from "./politicianTraits/parties/hayamin-hamamlakhti.json";
import likud from "./politicianTraits/parties/likud.json";
import noam from "./politicianTraits/parties/noam.json";
import otzmaYehudit from "./politicianTraits/parties/otzma-yehudit.json";
import raam from "./politicianTraits/parties/raam.json";
import religiousZionism from "./politicianTraits/parties/religious-zionism.json";
import shas from "./politicianTraits/parties/shas.json";
import unitedTorahJudaism from "./politicianTraits/parties/united-torah-judaism.json";
import yashar from "./politicianTraits/parties/yashar.json";
import yeshAtid from "./politicianTraits/parties/yesh-atid.json";
import yisraelBeiteinu from "./politicianTraits/parties/yisrael-beiteinu.json";

const RAW_POLITICIAN_TRAITS = {
  ...bennett2026,
  ...blueAndWhite,
  ...democrats,
  ...elHaDegel,
  ...hadashTaal,
  ...haMiluimnikim,
  ...haYaminHaMamlakhti,
  ...likud,
  ...noam,
  ...otzmaYehudit,
  ...raam,
  ...religiousZionism,
  ...shas,
  ...unitedTorahJudaism,
  ...yashar,
  ...yeshAtid,
  ...yisraelBeiteinu,
};

const TRAIT_ENUMS = {
  face: new Set(["round", "square", "oval", "long"]),
  hair: new Set([
    "swept",
    "short",
    "cropped",
    "curly",
    "wavy",
    "receding",
    "bald",
    "long",
    "styled",
    "side-part",
  ]),
  glasses: new Set(["round", "rectangular", "thin", null]),
  beard: new Set(["full", "full-long", "goatee", "stubble", "mustache", null]),
  headCovering: new Set([
    "kippah",
    "kippah-white",
    "kippah-knit",
    "shtreimel",
    "hijab",
    "tichel",
    null,
  ]),
};

const COLOR_FIELDS = new Set([
  "skin",
  "hairColor",
  "eyeColor",
  "beardColor",
  "headCoveringColor",
  "suitColor",
  "tieColor",
  "bgColor",
]);
const BOOLEAN_FIELDS = new Set(["grayHair", "eyebrowThick", "peyot"]);
const NAMED_COLORS = new Set(["white", "black"]);
const HEX_COLOR = /^#([\da-fA-F]{3}|[\da-fA-F]{6})$/;

function isValidColor(value) {
  if (typeof value !== "string") return false;
  return HEX_COLOR.test(value) || NAMED_COLORS.has(value.toLowerCase());
}

function sanitizeTraitEntry(id, entry, issues) {
  if (entry === null) return null;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    issues.push(`${id}:invalid-entry`);
    return null;
  }

  const clean = {};

  for (const [key, value] of Object.entries(entry)) {
    if (key in TRAIT_ENUMS) {
      if (TRAIT_ENUMS[key].has(value)) {
        clean[key] = value;
      } else {
        issues.push(`${id}.${key}:invalid-value`);
      }
      continue;
    }

    if (BOOLEAN_FIELDS.has(key)) {
      if (typeof value === "boolean") {
        clean[key] = value;
      } else {
        issues.push(`${id}.${key}:invalid-boolean`);
      }
      continue;
    }

    if (COLOR_FIELDS.has(key)) {
      if (value === null && key === "tieColor") {
        clean[key] = value;
      } else if (isValidColor(value)) {
        clean[key] = value;
      } else {
        issues.push(`${id}.${key}:invalid-color`);
      }
      continue;
    }

    issues.push(`${id}.${key}:unknown-field`);
  }

  return clean;
}

function buildValidatedTraitsMap(source) {
  const issues = [];
  const traits = {};

  for (const [id, entry] of Object.entries(source)) {
    traits[id] = sanitizeTraitEntry(id, entry, issues);
  }

  return { traits: Object.freeze(traits), issues: Object.freeze(issues) };
}

const { traits, issues } = buildValidatedTraitsMap(RAW_POLITICIAN_TRAITS);

if (issues.length > 0 && import.meta.env?.DEV) {
  const examples = issues.slice(0, 8).join(", ");
  throw new Error(`Invalid avatar trait config detected: ${examples}`);
}

export const POLITICIAN_TRAIT_ISSUES = issues;
export default traits;
