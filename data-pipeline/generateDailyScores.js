import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import os from "os";
import { fileURLToPath } from "url";
import {
  dailyEntrySchema,
  llmResponseSchema,
  parseLLMResponse8dim,
  summaryRowSchema8dim,
} from "./lib/parseLLMResponse.js";
import retry from "./lib/retry.js";
import {
  applyWingRelativeNorm,
  computeAgendaBonus,
  computeFieldActivity,
  computeFlipFlopIndex,
  computeLegislativeQuality,
  computeMediaCredibility,
  computeOverallScore8dim,
  computeParliamentaryActivity,
  computePublicSentiment,
  computeSatireCulturalImpact,
  computeTransparencyEthics,
} from "./lib/computeScore.js";
import { fetchParliamentaryData, clearCache as clearOknessetCache } from "./lib/openKnesset.js";
import {
  aggregateParties,
  detectOutliers,
  isSpamContent,
  validateChainOfThought,
  validateDimensionConsistency,
  validatePartyConsistency,
  validateTemporalConsistency,
} from "./lib/validation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Promises Database ──────────────────────────────────────────────────
// Static election promises per politician — used for Flip-Flop Index scoring.
const PROMISES_DB = (() => {
  try {
    const dbPath = path.join(__dirname, "data", "promises-database.json");
    const raw = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    console.log(
      `[Promises] Loaded promises for ${Object.keys(raw.politicians || {}).length} politicians`
    );
    return raw.politicians || {};
  } catch (err) {
    console.warn(`[Promises] Could not load promises-database.json: ${err.message}`);
    return {};
  }
})();

// ── Hebrew Name Lookup ────────────────────────────────────────────────
// Load Hebrew politician names from i18n translation file for Hebrew search queries
const HEBREW_NAMES = (() => {
  try {
    const i18nPath = path.resolve(__dirname, "../src/locales/he/translation.json");
    const translations = JSON.parse(fs.readFileSync(i18nPath, "utf-8"));
    const names = translations.politicians || {};
    console.log(`[i18n] Loaded ${Object.keys(names).length} Hebrew politician names`);
    return names;
  } catch (err) {
    console.warn(
      `[i18n] Could not load Hebrew names — Hebrew search queries will use English names: ${err.message}`
    );
    return {};
  }
})();

// ── Configuration ──────────────────────────────────────────────────────
// role: "mk" (default if omitted), "minister", "deputy-minister", or "politician"
const POLITICIANS = [
  // ── Likud (32 MKs + 6 ministers/deputy-ministers) ────────────────────
  {
    id: "benjamin-netanyahu",
    name: "Benjamin Netanyahu",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "yariv-levin", name: "Yariv Levin", party: "Likud", wing: "right", sector: "secular" },
  { id: "nir-barkat", name: "Nir Barkat", party: "Likud", wing: "right", sector: "secular" },
  { id: "amir-ohana", name: "Amir Ohana", party: "Likud", wing: "right", sector: "secular" },
  { id: "yisrael-katz", name: "Yisrael Katz", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "yuli-edelstein",
    name: "Yuli Edelstein",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "shlomo-karhi", name: "Shlomo Karhi", party: "Likud", wing: "right", sector: "secular" },
  { id: "avi-dichter", name: "Avi Dichter", party: "Likud", wing: "right", sector: "secular" },
  { id: "david-bitan", name: "David Bitan", party: "Likud", wing: "right", sector: "secular" },
  { id: "boaz-bismuth", name: "Boaz Bismuth", party: "Likud", wing: "right", sector: "secular" },
  { id: "ariel-kallner", name: "Ariel Kallner", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "hanoch-milwidsky",
    name: "Hanoch Milwidsky",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "tally-gotliv", name: "Tally Gotliv", party: "Likud", wing: "right", sector: "secular" },
  { id: "dan-ilouz", name: "Dan Ilouz", party: "Likud", wing: "right", sector: "secular" },
  { id: "moshe-saada", name: "Moshe Saada", party: "Likud", wing: "right", sector: "secular" },
  { id: "nissim-vaturi", name: "Nissim Vaturi", party: "Likud", wing: "right", sector: "secular" },
  { id: "osher-shkalim", name: "Osher Shkalim", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "avichay-buaron",
    name: "Avichay Buaron",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "tsega-melaku", name: "Tsega Melaku", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "eliyahu-revivo",
    name: "Eliyahu Revivo",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "keti-shitrit", name: "Keti Shitrit", party: "Likud", wing: "right", sector: "secular" },
  { id: "ofir-katz", name: "Ofir Katz", party: "Likud", wing: "right", sector: "secular" },
  { id: "may-golan", name: "May Golan", party: "Likud", wing: "right", sector: "secular" },
  { id: "gila-gamliel", name: "Gila Gamliel", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "galit-distel-atbaryan",
    name: "Galit Distel Atbaryan",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "eli-dalal", name: "Eli Dalal", party: "Likud", wing: "right", sector: "secular" },
  { id: "shalom-danino", name: "Shalom Danino", party: "Likud", wing: "right", sector: "secular" },
  { id: "amit-halevi", name: "Amit Halevi", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "hava-eti-atia",
    name: "Hava Eti Atia",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "moshe-passal", name: "Moshe Passal", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "sasson-guetta",
    name: "Sasson Guetta",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "afif-abed", name: "Afif Abed", party: "Likud", wing: "right", sector: "druze" },
  // Likud ministers (not serving as MKs)
  {
    id: "eli-cohen",
    name: "Eli Cohen",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "david-amsalem",
    name: "David Amsalem",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "miki-zohar",
    name: "Miki Zohar",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "yoav-kish",
    name: "Yoav Kish",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "haim-katz",
    name: "Haim Katz",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "miri-regev",
    name: "Miri Regev",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "amichai-shikli",
    name: "Amichai Shikli",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "idit-silman",
    name: "Idit Silman",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "deputy-minister",
  },

  // ── Yesh Atid (24) ──────────────────────────────────────────────────
  { id: "yair-lapid", name: "Yair Lapid", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "boaz-toporovsky",
    name: "Boaz Toporovsky",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  { id: "meir-cohen", name: "Meir Cohen", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "karine-elharrar",
    name: "Karine Elharrar",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  { id: "mickey-levy", name: "Mickey Levy", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "yorai-lahav-hertzano",
    name: "Yorai Lahav-Hertzano",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "meirav-ben-ari",
    name: "Meirav Ben Ari",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  { id: "ron-katz", name: "Ron Katz", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "simon-davidson",
    name: "Simon Davidson",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "debbie-biton",
    name: "Debbie Biton",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  { id: "naor-shiri", name: "Naor Shiri", party: "Yesh Atid", wing: "center", sector: "secular" },
  { id: "merav-cohen", name: "Merav Cohen", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "tatiana-mazarsky",
    name: "Tatiana Mazarsky",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "vladimir-beliak",
    name: "Vladimir Beliak",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "moshe-tur-paz",
    name: "Moshe Tur-Paz",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "yoav-segalovitz",
    name: "Yoav Segalovitz",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "elazar-stern",
    name: "Elazar Stern",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "ram-ben-barak",
    name: "Ram Ben Barak",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  { id: "yaron-levy", name: "Yaron Levy", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "shelly-tal-meron",
    name: "Shelly Tal Meron",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "adi-azuz",
    name: "Adi Azuz",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "yasmin-fridman",
    name: "Yasmin Fridman",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "matti-sarfatti-harcavi",
    name: "Matti Sarfatti Harcavi",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "michal-shir-segman",
    name: "Michal Shir Segman",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },

  // ── Blue and White (8) ───────────────────────────────────────────
  {
    id: "benny-gantz",
    name: "Benny Gantz",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "pnina-tamano-shata",
    name: "Pnina Tamano-Shata",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "hili-tropper",
    name: "Hili Tropper",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "orit-farkash-hacohen",
    name: "Orit Farkash-Hacohen",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "alon-schuster",
    name: "Alon Schuster",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "michael-biton",
    name: "Michael Biton",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "eitan-ginzburg",
    name: "Eitan Ginzburg",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },
  {
    id: "yael-ron-ben-moshe",
    name: "Yael Ron Ben Moshe",
    party: "Blue and White",
    wing: "center",
    sector: "secular",
  },

  // ── Yashar! with Eisenkot (2) ──────────────────────────────────
  {
    id: "gadi-eisenkot",
    name: "Gadi Eisenkot",
    party: "Yashar",
    wing: "center",
    sector: "secular",
    role: "politician",
  },
  {
    id: "matan-kahana",
    name: "Matan Kahana",
    party: "Yashar",
    wing: "center",
    sector: "religious",
    role: "politician",
  },

  // ── HaMiluimnikim (1) ──────────────────────────────────────────
  {
    id: "yoaz-hendel",
    name: "Yoaz Hendel",
    party: "HaMiluimnikim",
    wing: "center",
    sector: "secular",
    role: "politician",
  },

  // ── Shas (11) ───────────────────────────────────────────────────────
  { id: "aryeh-deri", name: "Aryeh Deri", party: "Shas", wing: "right", sector: "haredi" },
  { id: "yoav-ben-tzur", name: "Yoav Ben-Tzur", party: "Shas", wing: "right", sector: "haredi" },
  { id: "yinon-azoulay", name: "Yinon Azoulay", party: "Shas", wing: "right", sector: "haredi" },
  { id: "moshe-arbel", name: "Moshe Arbel", party: "Shas", wing: "right", sector: "haredi" },
  {
    id: "michael-malchieli",
    name: "Michael Malchieli",
    party: "Shas",
    wing: "right",
    sector: "haredi",
  },
  { id: "haim-biton", name: "Haim Biton", party: "Shas", wing: "right", sector: "haredi" },
  { id: "uriel-buso", name: "Uriel Buso", party: "Shas", wing: "right", sector: "haredi" },
  { id: "yaakov-margi", name: "Yaakov Margi", party: "Shas", wing: "right", sector: "haredi" },
  { id: "moshe-abutbul", name: "Moshe Abutbul", party: "Shas", wing: "right", sector: "haredi" },
  { id: "yosef-taieb", name: "Yosef Taieb", party: "Shas", wing: "right", sector: "haredi" },
  {
    id: "yonatan-mishraki",
    name: "Yonatan Mishraki",
    party: "Shas",
    wing: "right",
    sector: "haredi",
  },

  // ── United Torah Judaism (7) ────────────────────────────────────────
  {
    id: "yitzhak-goldknopf",
    name: "Yitzhak Goldknopf",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },
  {
    id: "moshe-gafni",
    name: "Moshe Gafni",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },
  {
    id: "uri-maklev",
    name: "Uri Maklev",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },
  {
    id: "yaakov-tesler",
    name: "Yaakov Tesler",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },
  {
    id: "meir-porush",
    name: "Meir Porush",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },
  {
    id: "yaakov-asher",
    name: "Yaakov Asher",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },
  {
    id: "yitzhak-pindrus",
    name: "Yitzhak Pindrus",
    party: "United Torah Judaism",
    wing: "right",
    sector: "haredi",
  },

  // ── Religious Zionism (7 MKs + 1 minister) ────────────────────────
  {
    id: "bezalel-smotrich",
    name: "Bezalel Smotrich",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
    role: "minister",
  },
  {
    id: "orit-strock",
    name: "Orit Strock",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },
  {
    id: "ofir-sofer",
    name: "Ofir Sofer",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },
  {
    id: "simcha-rothman",
    name: "Simcha Rothman",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },
  {
    id: "zvi-sukkot",
    name: "Zvi Sukkot",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },
  {
    id: "ohad-tal",
    name: "Ohad Tal",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },
  {
    id: "michal-waldiger",
    name: "Michal Waldiger",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },
  {
    id: "moshe-solomon",
    name: "Moshe Solomon",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
  },

  // ── Otzma Yehudit (6) ──────────────────────────────────────────────
  {
    id: "itamar-ben-gvir",
    name: "Itamar Ben Gvir",
    party: "Otzma Yehudit",
    wing: "right",
    sector: "religious",
  },
  {
    id: "zvika-fogel",
    name: "Zvika Fogel",
    party: "Otzma Yehudit",
    wing: "right",
    sector: "religious",
  },
  {
    id: "yitzhak-wasserlauf",
    name: "Yitzhak Wasserlauf",
    party: "Otzma Yehudit",
    wing: "right",
    sector: "religious",
  },
  {
    id: "amichai-eliyahu",
    name: "Amichai Eliyahu",
    party: "Otzma Yehudit",
    wing: "right",
    sector: "religious",
  },
  {
    id: "limor-son-har-melech",
    name: "Limor Son Har-Melech",
    party: "Otzma Yehudit",
    wing: "right",
    sector: "religious",
  },
  {
    id: "yitzhak-kroizer",
    name: "Yitzhak Kroizer",
    party: "Otzma Yehudit",
    wing: "right",
    sector: "religious",
  },

  // ── Yisrael Beiteinu (6) ───────────────────────────────────────────
  {
    id: "avigdor-lieberman",
    name: "Avigdor Lieberman",
    party: "Yisrael Beiteinu",
    wing: "center",
    sector: "secular",
  },
  {
    id: "oded-forer",
    name: "Oded Forer",
    party: "Yisrael Beiteinu",
    wing: "center",
    sector: "secular",
  },
  {
    id: "evgeny-sova",
    name: "Evgeny Sova",
    party: "Yisrael Beiteinu",
    wing: "center",
    sector: "secular",
  },
  {
    id: "hamad-amar",
    name: "Hamad Amar",
    party: "Yisrael Beiteinu",
    wing: "center",
    sector: "druze",
  },
  {
    id: "yulia-malinovsky",
    name: "Yulia Malinovsky",
    party: "Yisrael Beiteinu",
    wing: "center",
    sector: "secular",
  },
  {
    id: "sharon-nir",
    name: "Sharon Nir",
    party: "Yisrael Beiteinu",
    wing: "center",
    sector: "secular",
  },

  // ── Ra'am (5) ──────────────────────────────────────────────────────
  { id: "mansour-abbas", name: "Mansour Abbas", party: "Ra'am", wing: "arab", sector: "arab" },
  { id: "waleed-taha", name: "Waleed Taha", party: "Ra'am", wing: "arab", sector: "arab" },
  {
    id: "iman-khatib-yasin",
    name: "Iman Khatib-Yasin",
    party: "Ra'am",
    wing: "arab",
    sector: "arab",
  },
  {
    id: "walid-alhawashla",
    name: "Walid Alhawashla",
    party: "Ra'am",
    wing: "arab",
    sector: "arab",
  },
  {
    id: "yasser-hujirat",
    name: "Yasser Hujirat",
    party: "Ra'am",
    wing: "arab",
    sector: "arab",
  },

  // ── Hadash-Ta'al (5) ──────────────────────────────────────────────
  { id: "ayman-odeh", name: "Ayman Odeh", party: "Hadash-Ta'al", wing: "arab", sector: "arab" },
  { id: "ahmad-tibi", name: "Ahmad Tibi", party: "Hadash-Ta'al", wing: "arab", sector: "arab" },
  {
    id: "aida-touma-suleiman",
    name: "Aida Touma-Suleiman",
    party: "Hadash-Ta'al",
    wing: "arab",
    sector: "arab",
  },
  {
    id: "ofer-cassif",
    name: "Ofer Cassif",
    party: "Hadash-Ta'al",
    wing: "arab",
    sector: "secular",
  },
  {
    id: "samir-ben-said",
    name: "Samir Ben Said",
    party: "Hadash-Ta'al",
    wing: "arab",
    sector: "arab",
  },

  // ── Labor → members moved to Democrats; Michaeli retired ─────────
  { id: "naama-lazimi", name: "Naama Lazimi", party: "Democrats", wing: "left", sector: "secular" },
  { id: "gilad-kariv", name: "Gilad Kariv", party: "Democrats", wing: "left", sector: "secular" },
  {
    id: "efrat-rayten",
    name: "Efrat Rayten Marom",
    party: "Democrats",
    wing: "left",
    sector: "secular",
  },

  // ── HaYamin HaMamlakhti (3 MKs) — Sa'ar & Elkin returned to Likud
  {
    id: "gideon-saar",
    name: "Gideon Sa'ar",
    party: "Likud",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "zeev-elkin",
    name: "Ze'ev Elkin",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  {
    id: "sharren-haskel",
    name: "Sharren Haskel",
    party: "HaYamin HaMamlakhti",
    wing: "right",
    sector: "secular",
  },
  {
    id: "michel-buskila",
    name: "Michel Buskila",
    party: "HaYamin HaMamlakhti",
    wing: "right",
    sector: "secular",
  },
  {
    id: "akram-hasson",
    name: "Akram Hasson",
    party: "HaYamin HaMamlakhti",
    wing: "right",
    sector: "druze",
  },

  // ── Noam (1) ──────────────────────────────────────────────────────
  { id: "avi-maoz", name: "Avi Maoz", party: "Noam", wing: "right", sector: "religious" },

  // ── Democrats (4 — Golan + 3 former Labor) ───────────────────────
  {
    id: "yair-golan",
    name: "Yair Golan",
    party: "Democrats",
    wing: "left",
    sector: "secular",
    role: "politician",
  },

  // ── El HaDegel (1) ──────────────────────────────────────────────
  {
    id: "matan-yafe",
    name: "Matan Yafe",
    party: "El HaDegel",
    wing: "right",
    sector: "secular",
    role: "politician",
  },

  // ── Bennett 2026 (1) ─────────────────────────────────────────────
  {
    id: "naftali-bennett",
    name: "Naftali Bennett",
    party: "Bennett 2026",
    wing: "right",
    sector: "religious",
    role: "politician",
  },
];

const DATA_DIR = path.resolve(__dirname, "../public/data");
const SUMMARY_PATH = path.join(DATA_DIR, "timeseries_summary.json");
const DETAILS_DIR = path.join(DATA_DIR, "details");
const RETENTION_DAYS = 90;
const PIPELINE_TIMEZONE = process.env.TZ || "Asia/Jerusalem";
const OPENAI_MODEL_HIGH = process.env.OPENAI_MODEL_HIGH || "gpt-5.4";
const OPENAI_MODEL_LOW = process.env.OPENAI_MODEL_LOW || "gpt-5.4-mini";
const OPENAI_TIMEOUT_MS = parsePositiveInt(process.env.OPENAI_TIMEOUT_MS, 600000);
const MAX_BATCH_SIZE = parsePositiveInt(process.env.MAX_BATCH_SIZE, 50);
const MAX_PROMPT_CHARS = parseNonNegativeInt(process.env.MAX_PROMPT_CHARS, 350000);
// Politicians with >= this many headlines+social get the high-tier model
const OPENAI_HIGH_TIER_THRESHOLD = parseNonNegativeInt(process.env.OPENAI_HIGH_TIER_THRESHOLD, 5);
const SOURCE_TIMEOUT_MS = parsePositiveInt(process.env.SOURCE_TIMEOUT_MS, 20000);
const EXPECTED_POLITICIAN_COUNT = parsePositiveInt(
  process.env.PIPELINE_EXPECTED_POLITICIAN_COUNT,
  135
);
const MAX_FETCH_FAILURES = parseNonNegativeInt(process.env.PIPELINE_MAX_FETCH_FAILURES, 0);
const SOURCES_CONFIG_PATH = process.env.PIPELINE_SOURCES_PATH
  ? path.resolve(process.env.PIPELINE_SOURCES_PATH)
  : path.join(__dirname, "sources.config.json");

const rssFeedCache = new Map();
const redditFeedCache = new Map();
const telegramFeedCache = new Map();
const fxpFeedCache = new Map();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getCurrentDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PIPELINE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parts.find((p) => p.type === type)?.value;
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function loadSourceConfig() {
  if (!fs.existsSync(SOURCES_CONFIG_PATH)) {
    throw new Error(`Source config not found: ${SOURCES_CONFIG_PATH}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(SOURCES_CONFIG_PATH, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to parse source config at ${SOURCES_CONFIG_PATH}: ${err.message}`);
  }

  if (!parsed?.rss?.searchTemplates?.length) {
    throw new Error("sources.config.json must define rss.searchTemplates");
  }
  if (!parsed?.social?.redditSubreddits?.length) {
    throw new Error("sources.config.json must define social.redditSubreddits");
  }

  return parsed;
}

function normalizeText(input) {
  return String(input ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeStrings(values) {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

const MIN_LATIN_TOKEN_LENGTH = 4;
const MIN_HEBREW_TOKEN_LENGTH = 3;
const HEBREW_TOKEN_DENYLIST = new Set(["בן"]);

export function buildSearchTerms(politician) {
  const tokenTerms = politician.name
    .split(/[\s\-']/)
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_LATIN_TOKEN_LENGTH);
  const terms = dedupeStrings([politician.name, politician.id.replace(/-/g, " "), ...tokenTerms]);
  // Add Hebrew name and its tokens for matching Hebrew headlines
  const hebrewName = HEBREW_NAMES[politician.name];
  if (hebrewName) {
    terms.push(hebrewName);
    const hebrewTokens = hebrewName
      .split(/\s+/)
      .map((token) => normalizeText(token))
      .filter(
        (token) => token.length >= MIN_HEBREW_TOKEN_LENGTH && !HEBREW_TOKEN_DENYLIST.has(token)
      );
    terms.push(...hebrewTokens);
  }
  return dedupeStrings(terms.map((term) => normalizeText(term)));
}

export function includesPolitician(text, searchTerms) {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const paddedText = ` ${normalized} `;
  return searchTerms.some((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm.length > 0 && paddedText.includes(` ${normalizedTerm} `);
  });
}

function decodeHtmlEntities(input) {
  const named = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  return String(input ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (match) => named[match] || match)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagValue(block, tagNames) {
  for (const tag of tagNames) {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return "";
}

function parseRssItems(xml) {
  const itemBlocks = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]);
  const entryBlocks = [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  const blocks = itemBlocks.length > 0 ? itemBlocks : entryBlocks;

  return blocks
    .map((block) => ({
      title: extractTagValue(block, ["title"]),
      description: extractTagValue(block, ["description", "summary", "content"]),
      link: extractTagValue(block, ["link", "guid"]),
    }))
    .filter((item) => item.title.length > 0);
}

async function fetchText(url, timeoutMs, extraHeaders = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "PolityMarketPipeline/1.0 (+https://github.com/RalbagI/PolityMarket)",
        ...extraHeaders,
      },
    });
    if (!response.ok) {
      const bodyPreview = (await response.text()).slice(0, 250);
      const error = new Error(`HTTP ${response.status} for ${url}: ${bodyPreview}`);
      error.status = response.status;
      throw error;
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, timeoutMs) {
  const body = await fetchText(url, timeoutMs);
  try {
    return JSON.parse(body);
  } catch (err) {
    throw new Error(`Invalid JSON payload from ${url}: ${err.message}`);
  }
}

async function getRssItems(url, maxItemsPerSource) {
  if (rssFeedCache.has(url)) {
    return rssFeedCache.get(url);
  }

  const xml = await retry(() => fetchText(url, SOURCE_TIMEOUT_MS), {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  });
  const parsed = parseRssItems(xml).slice(0, maxItemsPerSource);
  rssFeedCache.set(url, parsed);
  return parsed;
}

async function getRedditPosts(subreddit, maxPosts) {
  const cacheKey = `${subreddit}:${maxPosts}`;
  if (redditFeedCache.has(cacheKey)) {
    return redditFeedCache.get(cacheKey);
  }

  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=${maxPosts}`;
  const payload = await retry(() => fetchJson(url, SOURCE_TIMEOUT_MS), {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  });

  const posts = (payload?.data?.children ?? [])
    .map((child) => child?.data)
    .filter(Boolean)
    .map((post) => ({
      subreddit: post.subreddit,
      author: post.author || "unknown",
      title: decodeHtmlEntities(post.title || ""),
      body: decodeHtmlEntities(post.selftext || ""),
      permalink: post.permalink ? `https://www.reddit.com${post.permalink}` : "",
      createdUtc: post.created_utc || 0,
    }));

  redditFeedCache.set(cacheKey, posts);
  return posts;
}

// ── Telegram Public Channel Scraping ─────────────────────────────────
// Scrapes t.me/s/{channel} HTML preview pages (no API key needed).
// Returns last ~20 messages from public channels.

async function getTelegramPosts(channel, maxPosts) {
  if (telegramFeedCache.has(channel)) {
    return telegramFeedCache.get(channel);
  }

  const url = `https://t.me/s/${channel}`;
  const html = await retry(() => fetchText(url, SOURCE_TIMEOUT_MS), {
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 10000,
  });

  // Parse messages from HTML: class="tgme_widget_message_text js-message_text"
  const messageRegex =
    /data-post="[^/]+\/(\d+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<a|<div class="tgme_widget_message)/g;
  const posts = [];
  let match;
  while ((match = messageRegex.exec(html)) !== null && posts.length < maxPosts) {
    const msgId = match[1];
    const rawHtml = match[2];
    // Strip HTML tags and decode entities (reuses existing utility)
    const text = decodeHtmlEntities(rawHtml);

    if (text.length > 10) {
      posts.push({
        author: channel,
        title: "",
        body: text,
        permalink: `https://t.me/${channel}/${msgId}`,
        createdUtc: 0,
      });
    }
  }

  // Warn if page returned content but no messages were parsed (HTML structure may have changed)
  if (posts.length === 0 && html.length > 1000) {
    console.warn(
      `[Telegram] Channel ${channel}: received ${html.length} bytes but parsed 0 messages — HTML structure may have changed`
    );
  }

  telegramFeedCache.set(channel, posts);
  return posts;
}

// ── FXP Forum Scraping ───────────────────────────────────────────────
// Scrapes thread titles from FXP forum pages (Israeli forums).

async function getFxpThreads(forumId, maxThreads) {
  const cacheKey = `fxp:${forumId}`;
  if (fxpFeedCache.has(cacheKey)) {
    return fxpFeedCache.get(cacheKey);
  }

  const url = `https://www.fxp.co.il/forumdisplay.php?f=${forumId}`;
  const html = await retry(() => fetchText(url, SOURCE_TIMEOUT_MS), {
    maxRetries: 2,
    initialDelay: 2000,
    maxDelay: 10000,
  });

  // Parse thread links: showthread.php?t=XXXXX">Thread Title
  const threadRegex = /showthread\.php\?t=(\d+)[^"]*"[^>]*>([^<]+)/g;
  const threads = [];
  let tmatch;
  const seen = new Set();

  while ((tmatch = threadRegex.exec(html)) !== null && threads.length < maxThreads) {
    const threadId = tmatch[1];
    const title = decodeHtmlEntities(tmatch[2]).trim();
    // Skip sticky/meta threads and duplicates
    if (seen.has(threadId) || title.length < 5) continue;
    seen.add(threadId);

    threads.push({
      author: "fxp_user",
      title,
      body: "",
      permalink: `https://www.fxp.co.il/showthread.php?t=${threadId}`,
      createdUtc: 0,
    });
  }

  fxpFeedCache.set(cacheKey, threads);
  return threads;
}

// ── Bluesky AT Protocol Search ───────────────────────────────────────
// Free public API — no auth needed. May return 403 from some IPs.

async function searchBlueskyPosts(query, maxPosts) {
  const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&limit=${maxPosts}`;
  const payload = await retry(() => fetchJson(url, SOURCE_TIMEOUT_MS), {
    maxRetries: 1,
    initialDelay: 2000,
    maxDelay: 5000,
  });

  return (payload?.posts ?? []).map((post) => ({
    author: post.author?.handle || "unknown",
    title: "",
    body: post.record?.text || "",
    permalink: post.uri
      ? `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split("/").pop()}`
      : "",
    createdUtc: post.record?.createdAt ? new Date(post.record.createdAt).getTime() / 1000 : 0,
  }));
}

function renderSearchTemplate(template, politician) {
  // Use Hebrew name for Hebrew search templates, English name otherwise
  const isHebrew = template.includes("hl=iw") || template.includes("ceid=IL:he");
  const hebrewName = HEBREW_NAMES[politician.name];
  const name = isHebrew && hebrewName ? hebrewName : politician.name;
  const quotedName = `"${name}"`;
  return template.replaceAll("{query}", encodeURIComponent(quotedName));
}

async function fetchRSSHeadlines(politician, sourceConfig) {
  const rssConfig = sourceConfig.rss;
  const searchTerms = buildSearchTerms(politician);
  const headlines = [];
  let successfulSources = 0;
  let failedSources = 0;

  for (const template of rssConfig.searchTemplates) {
    const url = renderSearchTemplate(template, politician);
    try {
      const items = await getRssItems(url, rssConfig.maxItemsPerSource);
      successfulSources++;
      for (const item of items) {
        if (isSpamContent(`${item.title} ${item.description}`, item.link)) continue;
        if (includesPolitician(`${item.title} ${item.description}`, searchTerms)) {
          headlines.push(item.title);
        }
      }
    } catch (err) {
      failedSources++;
      console.warn(`[RSS] ${politician.name}: failed query feed (${url}) — ${err.message}`);
    }
  }

  for (const url of rssConfig.globalFeeds ?? []) {
    try {
      const items = await getRssItems(url, rssConfig.maxItemsPerSource);
      successfulSources++;
      for (const item of items) {
        if (isSpamContent(`${item.title} ${item.description}`, item.link)) continue;
        if (includesPolitician(`${item.title} ${item.description}`, searchTerms)) {
          headlines.push(item.title);
        }
      }
    } catch (err) {
      failedSources++;
      console.warn(`[RSS] ${politician.name}: failed global feed (${url}) — ${err.message}`);
    }
  }

  if (successfulSources === 0) {
    throw new Error(
      `[RSS] ${politician.name}: all configured sources failed (${failedSources} failures)`
    );
  }

  const unique = dedupeStrings(headlines).slice(0, rssConfig.maxHeadlinesPerPolitician);
  if (unique.length === 0) {
    unique.push(`No direct headlines matched ${politician.name} in configured sources this cycle.`);
  }
  console.log(`[RSS] Fetched ${unique.length} filtered headlines for ${politician.name}`);
  return unique;
}

async function fetchSocialMediaMentions(politician, sourceConfig) {
  const socialConfig = sourceConfig.social;
  const searchTerms = buildSearchTerms(politician);
  const matches = [];
  let successfulSources = 0;
  let failedSources = 0;

  // Helper: process a list of posts, filter spam, and push matching mentions
  function processPosts(posts, sourceLabel) {
    for (const post of posts) {
      const combined = `${post.title} ${post.body}`;
      if (isSpamContent(combined, post.permalink)) continue;
      if (!includesPolitician(combined, searchTerms)) continue;
      matches.push({
        text: post.body
          ? `${post.title} — ${post.body.slice(0, 240)}`.trim().replace(/^— /, "")
          : post.title,
        thread_context: post.permalink ? [`Source: ${post.permalink}`] : [],
        speaker_metadata: {
          handle: `@${post.author}`,
          known_satirist: /satire|parody|meme/i.test(`${post.author} ${combined}`),
        },
      });
    }
  }

  // ── Reddit ──────────────────────────────────────────────────────────
  for (const subreddit of socialConfig.redditSubreddits ?? []) {
    try {
      const posts = await getRedditPosts(subreddit, socialConfig.maxPostsPerSubreddit);
      successfulSources++;
      processPosts(posts, "Reddit");
    } catch (err) {
      failedSources++;
      console.warn(`[Social] ${politician.name}: failed Reddit (${subreddit}) — ${err.message}`);
    }
  }

  // ── Telegram ────────────────────────────────────────────────────────
  const telegramConfig = socialConfig.telegram;
  if (telegramConfig?.channels?.length) {
    for (const channel of telegramConfig.channels) {
      try {
        const posts = await getTelegramPosts(channel, telegramConfig.maxMessagesPerChannel || 20);
        successfulSources++;
        processPosts(posts, "Telegram");
      } catch (err) {
        failedSources++;
        console.warn(`[Social] ${politician.name}: failed Telegram (${channel}) — ${err.message}`);
      }
    }
  }

  // ── FXP Forum ───────────────────────────────────────────────────────
  const fxpConfig = socialConfig.fxp;
  if (fxpConfig?.forumIds?.length) {
    for (const forumId of fxpConfig.forumIds) {
      try {
        const threads = await getFxpThreads(forumId, fxpConfig.maxThreadsPerForum || 30);
        successfulSources++;
        processPosts(threads, "FXP");
      } catch (err) {
        failedSources++;
        console.warn(`[Social] ${politician.name}: failed FXP (f=${forumId}) — ${err.message}`);
      }
    }
  }

  // ── Bluesky ─────────────────────────────────────────────────────────
  const blueskyConfig = socialConfig.bluesky;
  if (blueskyConfig?.enabled) {
    try {
      const hebrewName = HEBREW_NAMES[politician.name] || politician.name;
      const posts = await searchBlueskyPosts(hebrewName, blueskyConfig.maxPostsPerSearch || 10);
      successfulSources++;
      processPosts(posts, "Bluesky");
    } catch (err) {
      // Bluesky is best-effort — don't count as failure
      console.warn(`[Social] ${politician.name}: Bluesky unavailable — ${err.message}`);
    }
  }

  if (successfulSources === 0) {
    throw new Error(
      `[Social] ${politician.name}: all configured sources failed (${failedSources} failures)`
    );
  }

  const seenTexts = new Map();
  for (const m of matches) {
    if (!seenTexts.has(m.text)) seenTexts.set(m.text, m);
  }
  const unique = [...seenTexts.values()].slice(0, socialConfig.maxMentionsPerPolitician);

  if (unique.length === 0) {
    unique.push({
      text: `No direct social mentions matched ${politician.name} in configured sources this cycle.`,
      thread_context: [],
      speaker_metadata: { handle: "@pipeline", known_satirist: false },
    });
  }

  console.log(`[Social] Fetched ${unique.length} filtered mentions for ${politician.name}`);
  return unique;
}

// ── LLM System Prompt ─────────────────────────────────────────────────
// Loaded from prompts/system-prompt.txt for easy review and iteration.

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts", "system-prompt.txt"),
  "utf-8"
);

// ── Batched Codex CLI Scoring ────────────────────────────────────────
// Instead of calling an LLM per-politician, we batch politicians into
// fewer prompts and call Codex CLI for each batch.

export function buildBatchedPrompt(
  politicians,
  politicianDataMap,
  oknessetMap,
  promisesDB,
  requireCoT = true
) {
  const _oknessetMap = oknessetMap || new Map();
  const _promisesDB = promisesDB || {};

  let prompt = `${SYSTEM_PROMPT}

---

Score ALL ${politicians.length} politicians below. For EACH, output a JSON object with ALL required fields.

Respond with a raw JSON array of ${politicians.length} objects. No markdown. No code fences.
"No matched headlines/mentions" = use neutral defaults. Do NOT output overall_score.

---
`;

  for (let i = 0; i < politicians.length; i++) {
    const p = politicians[i];
    const data = politicianDataMap.get(p.id) || { headlines: [], socialMentions: [] };
    const okData = _oknessetMap.get(p.id) ?? null;
    const politicianPromises = _promisesDB[p.id]?.promises ?? [];

    const headlineBlock =
      data.headlines.length > 0
        ? data.headlines.map((h) => `- ${h}`).join("\n")
        : "No matched headlines";

    const mentionBlock =
      data.socialMentions.length > 0
        ? data.socialMentions
            .map((m) => {
              let entry = `- "${m.text}"`;
              if (m.speaker_metadata?.known_satirist) {
                entry += " [Speaker: known satirist]";
              }
              if (m.thread_context?.length) {
                entry += `\n  Thread context: "${m.thread_context[0]}"`;
              }
              return entry;
            })
            .join("\n")
        : "No matched social mentions";

    // Voting record block from OpenKnesset (up to 10 votes)
    const votingBlock =
      okData?.voting_record?.length > 0
        ? okData.voting_record
            .map((v) => `  - "${v.title}" — voted: ${v.vote}${v.date ? ` (${v.date})` : ""}`)
            .join("\n")
        : "  No recent voting record available";

    const mmmCount = okData?.mmm_requests_count ?? 0;

    // Promises block (top 5 by weight, for LLM flip-flop analysis)
    const topPromises = [...politicianPromises]
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 5);

    const promisesBlock =
      topPromises.length > 0
        ? topPromises
            .map(
              (pr) =>
                `  - "${String(pr.text_en || "").slice(0, 200)}" [date: ${pr.date}] [topic: ${pr.topic}] [context: ${pr.context}]`
            )
            .join("\n")
        : "  No promises database entries for this politician";

    const coalitionRole = ["right", "religious"].includes(p.wing) ? "coalition" : "opposition";
    const cotFlag = requireCoT ? "" : " [COT: skip]";

    prompt += `
[${i + 1}] ${p.id} | ${p.name} (${p.party}) | Wing: ${p.wing} | Role: ${coalitionRole}${cotFlag}
Headlines:
${headlineBlock}
Social:
${mentionBlock}
Voting record (last 7 days, from OpenKnesset):
${votingBlock}
MMM research requests this week: ${mmmCount}
Election promises (compare against current week actions):
${promisesBlock}
`;
  }

  return prompt;
}

export function parseCodexOutput(rawText) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch (innerErr) {
        throw new Error(`Failed to parse Codex response JSON fragment: ${innerErr.message}`);
      }
    } else {
      throw new Error(`Failed to parse Codex response as JSON: ${e.message}`);
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Codex response is not an array (got ${typeof parsed})`);
  }

  return parsed;
}

// reasoningEffort: "low" | "medium" | "high" | "xhigh" per codex config.toml spec
function callCodexCLI(prompt, model, reasoningEffort = "medium") {
  const tmpOut = path.join(
    os.tmpdir(),
    `codex-out-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`
  );
  const env = { ...process.env };

  try {
    // SECURITY: execute codex in a read-only sandbox without bypassing approvals.
    // The prompt contains untrusted RSS/social data, so prompt-injected shell/tool actions
    // should fail closed rather than execute unsandboxed commands.
    execFileSync(
      "codex",
      [
        "exec",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "-m",
        model,
        "-c",
        `model_reasoning_effort="${reasoningEffort}"`,
        "-o",
        tmpOut,
      ],
      {
        input: prompt,
        env,
        maxBuffer: 20 * 1024 * 1024,
        timeout: OPENAI_TIMEOUT_MS,
        encoding: "utf-8",
      }
    );

    if (!fs.existsSync(tmpOut)) {
      throw new Error("Codex CLI did not produce an output file");
    }
    const output = fs.readFileSync(tmpOut, "utf-8").trim();
    if (!output) {
      throw new Error("Codex CLI produced an empty output file");
    }
    console.log(`  Codex [${model}]: ${output.length} chars`);
    return parseCodexOutput(output);
  } finally {
    try {
      fs.unlinkSync(tmpOut);
    } catch {
      // ignore cleanup errors
    }
  }
}

export function shouldRetryBatchError(err) {
  const msg = String(err?.message || "").toLowerCase();

  if (msg.includes("enoent") && msg.includes("codex")) {
    return false;
  }
  if (
    msg.includes("authentication") ||
    msg.includes("api key") ||
    msg.includes("not authorized") ||
    msg.includes("permission denied") ||
    msg.includes("invalid model") ||
    msg.includes("model not found")
  ) {
    return false;
  }

  return true;
}

export function splitPoliticiansIntoBatches(
  politicians,
  politicianDataMap,
  maxBatchSize,
  maxPromptChars,
  oknessetMap,
  promisesDB
) {
  if (!Array.isArray(politicians) || politicians.length === 0) {
    return [];
  }

  const cappedBatchSize = Math.max(1, Number(maxBatchSize) || 1);
  const enforceCharBudget = Number(maxPromptChars) > 0;
  const batches = [];
  let current = [];

  const exceedsPromptBudget = (batch) => {
    if (!enforceCharBudget) return false;
    return (
      buildBatchedPrompt(batch, politicianDataMap, oknessetMap, promisesDB).length > maxPromptChars
    );
  };

  for (const politician of politicians) {
    if (current.length === 0) {
      current = [politician];
      if (exceedsPromptBudget(current)) {
        console.warn(`  ⚠ Single-politician prompt exceeds MAX_PROMPT_CHARS for ${politician.id}`);
      }
      continue;
    }

    const candidate = [...current, politician];
    const exceedsCount = candidate.length > cappedBatchSize;
    const exceedsChars = exceedsPromptBudget(candidate);
    if (exceedsCount || exceedsChars) {
      batches.push(current);
      current = [politician];
      if (exceedsPromptBudget(current)) {
        console.warn(`  ⚠ Single-politician prompt exceeds MAX_PROMPT_CHARS for ${politician.id}`);
      }
      continue;
    }
    current = candidate;
  }

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;
}

async function batchScoreAllPoliticians(politicians, politicianDataMap, oknessetMap, promisesDB) {
  // Classify by news activity: high-tier gets OPENAI_MODEL_HIGH, low-tier gets OPENAI_MODEL_LOW
  const highTier = [];
  const lowTier = [];
  for (const p of politicians) {
    const data = politicianDataMap.get(p.id) || { headlines: [], socialMentions: [] };
    const activity = data.headlines.length + Math.floor(data.socialMentions.length / 2);
    if (activity >= OPENAI_HIGH_TIER_THRESHOLD) {
      highTier.push(p);
    } else {
      lowTier.push(p);
    }
  }

  console.log(
    `  Model tiering: ${highTier.length} → ${OPENAI_MODEL_HIGH}, ${lowTier.length} → ${OPENAI_MODEL_LOW}`
  );

  const allResults = [];

  for (const [tierName, tierPoliticians, model, requireCoT, reasoning] of [
    ["HIGH", highTier, OPENAI_MODEL_HIGH, true, "high"],
    ["LOW", lowTier, OPENAI_MODEL_LOW, false, "low"],
  ]) {
    if (tierPoliticians.length === 0) continue;

    const batches = splitPoliticiansIntoBatches(
      tierPoliticians,
      politicianDataMap,
      MAX_BATCH_SIZE,
      MAX_PROMPT_CHARS,
      oknessetMap,
      promisesDB
    );

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      console.log(
        `\n  [${tierName}] Batch ${b + 1}/${batches.length} (${batch.length} politicians) via ${model}...`
      );

      const prompt = buildBatchedPrompt(
        batch,
        politicianDataMap,
        oknessetMap,
        promisesDB,
        requireCoT
      );
      console.log(`  Prompt size: ${prompt.length} chars`);

      const results = await retry(() => callCodexCLI(prompt, model, reasoning), {
        maxRetries: 2,
        initialDelay: 5000,
        maxDelay: 30000,
        shouldRetry: shouldRetryBatchError,
        onRetry: (err, attempt, delay) => {
          console.warn(
            `  ⟳ Retry ${attempt}/2 for [${tierName}] batch ${b + 1} in ${Math.round(delay)}ms: ${err.message}`
          );
        },
      });

      allResults.push(...results);
    }
  }

  return allResults;
}

// ── Artifact Writers ─────────────────────────────────────────────────
function appendToSummary(entries, today) {
  let summary = [];
  try {
    summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf-8"));
  } catch {
    // Starting fresh
  }

  if (!Array.isArray(summary)) {
    throw new Error("timeseries_summary.json must be an array");
  }

  summary = summary.filter((e) => e.date !== today);
  for (const entry of entries) {
    const summaryRow = {
      date: entry.date,
      politician_id: entry.politician_id,
      name: entry.name,
      party: entry.party,
      wing: entry.wing,
      sector: entry.sector,
      role: entry.role,
      overall_score: entry.overall_score,
      media_volume: entry.media_volume,
      // 8-dimension scores (null for historical entries)
      dim_public_sentiment: entry.dim_public_sentiment ?? null,
      dim_parliamentary_activity: entry.dim_parliamentary_activity ?? null,
      dim_media_credibility: entry.dim_media_credibility ?? null,
      dim_transparency_ethics: entry.dim_transparency_ethics ?? null,
      dim_field_activity: entry.dim_field_activity ?? null,
      dim_satire_cultural_impact: entry.dim_satire_cultural_impact ?? null,
      dim_legislative_quality: entry.dim_legislative_quality ?? null,
      dim_flipflop_index: entry.dim_flipflop_index ?? null,
    };
    const validated = summaryRowSchema8dim.safeParse(summaryRow);
    if (!validated.success) {
      const errors = validated.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Summary row validation failed: ${errors}`);
    }
    summary.push(validated.data);
  }
  summary.sort(
    (a, b) => a.date.localeCompare(b.date) || a.politician_id.localeCompare(b.politician_id)
  );
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log(`  → Summary: ${summary.length} total rows`);
}

function writeDetailFile(entries, today) {
  fs.mkdirSync(DETAILS_DIR, { recursive: true });
  const detailEntries = entries.map((e) => ({
    politician_id: e.politician_id,
    name: e.name,
    party: e.party,
    wing: e.wing,
    sector: e.sector,
    role: e.role,
    // Core 3-dim LLM outputs
    hostility_level: e.hostility_level,
    policy_approval: e.policy_approval,
    media_amplification: e.media_amplification,
    news_sentiment: e.news_sentiment,
    social_sentiment: e.social_sentiment,
    media_volume: e.media_volume,
    overall_score: e.overall_score,
    chain_of_thought: e.chain_of_thought,
    // 8-dimension composite scores
    dim_public_sentiment: e.dim_public_sentiment ?? null,
    dim_parliamentary_activity: e.dim_parliamentary_activity ?? null,
    dim_media_credibility: e.dim_media_credibility ?? null,
    dim_transparency_ethics: e.dim_transparency_ethics ?? null,
    dim_field_activity: e.dim_field_activity ?? null,
    dim_satire_cultural_impact: e.dim_satire_cultural_impact ?? null,
    dim_legislative_quality: e.dim_legislative_quality ?? null,
    dim_flipflop_index: e.dim_flipflop_index ?? null,
    // Agenda bonus
    agenda_setting_score: e.agenda_setting_score ?? null,
    agenda_bonus: e.agenda_bonus ?? null,
    // Media credibility sub-fields
    media_credibility_llm: e.media_credibility_llm ?? null,
    media_credibility_factcheck: e.media_credibility_factcheck ?? null,
    tv_radio_mentions: e.tv_radio_mentions ?? null,
    // Satire sub-fields
    satire_mentions_count: e.satire_mentions_count ?? null,
    satire_tone: e.satire_tone ?? null,
    // Field activity sub-fields
    field_activities_confirmed: e.field_activities_confirmed ?? null,
    // Transparency sub-fields
    transparency_ethics_score: e.transparency_ethics_score ?? null,
    lobbyist_meetings_count: e.lobbyist_meetings_count ?? null,
    // Parliamentary sub-fields (OpenKnesset)
    parl_attendance_rate: e.parl_attendance_rate ?? null,
    parl_committee_rate: e.parl_committee_rate ?? null,
    parl_initiative_score: e.parl_initiative_score ?? null,
    parl_data_source: e.parl_data_source ?? null,
    // Legislative quality sub-fields
    legislative_pro_socioeconomic: e.legislative_pro_socioeconomic ?? null,
    mmm_requests_count: e.mmm_requests_count ?? null,
    // Flip-flop sub-fields
    flipflop_contradictions: e.flipflop_contradictions ?? null,
    flipflop_promises_checked: e.flipflop_promises_checked ?? null,
    // Source data
    news_headlines: Array.isArray(e.news_headlines) ? e.news_headlines : [],
    social_mentions: Array.isArray(e.social_mentions) ? e.social_mentions : [],
  }));
  const detailPath = path.join(DETAILS_DIR, `${today}.json`);
  fs.writeFileSync(detailPath, JSON.stringify(detailEntries, null, 2));
  console.log(`  → Detail: ${detailPath}`);
}

function writePartySummary(partyEntries, today) {
  const partyPath = path.join(DATA_DIR, "party_summary.json");
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(partyPath, "utf-8"));
  } catch {
    // Starting fresh
  }
  if (!Array.isArray(existing)) existing = [];

  // Remove today's entries if re-running
  existing = existing.filter((e) => e.date !== today);
  existing.push(...partyEntries);
  existing.sort((a, b) => a.date.localeCompare(b.date) || a.party.localeCompare(b.party));

  // Keep last 90 days
  const allDates = [...new Set(existing.map((e) => e.date))].sort();
  if (allDates.length > 90) {
    const cutoffDate = allDates[allDates.length - 90];
    existing = existing.filter((e) => e.date >= cutoffDate);
  }

  fs.writeFileSync(partyPath, JSON.stringify(existing, null, 2));
  console.log(`  → Party summary: ${partyEntries.length} parties for ${today}`);
}

function pruneOldDetails() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  if (!fs.existsSync(DETAILS_DIR)) return;
  const files = fs.readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".json"));
  let pruned = 0;
  for (const file of files) {
    const date = file.replace(".json", "");
    if (date < cutoffStr) {
      fs.unlinkSync(path.join(DETAILS_DIR, file));
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`  → Pruned ${pruned} detail files older than ${RETENTION_DAYS} days`);
  }
}

// ── Main Pipeline ──────────────────────────────────────────────────────
async function main() {
  const today = getCurrentDateString();
  console.log(`\n📊 PolityMarket Daily Pipeline — ${today}`);
  console.log(
    `   LLM: ${OPENAI_MODEL_HIGH} (high-tier) / ${OPENAI_MODEL_LOW} (low-tier) — batched\n`
  );

  if (POLITICIANS.length !== EXPECTED_POLITICIAN_COUNT) {
    throw new Error(
      `Politician roster mismatch: expected ${EXPECTED_POLITICIAN_COUNT}, got ${POLITICIANS.length}`
    );
  }

  const sourceConfig = loadSourceConfig();

  // ── Phase 1: Fetch all RSS + Reddit data ────────────────────────────
  console.log("Phase 1: Fetching media data...");
  const politicianDataMap = new Map();
  const fetchFailures = [];

  for (const politician of POLITICIANS) {
    try {
      const headlines = await fetchRSSHeadlines(politician, sourceConfig);
      const socialMentions = await fetchSocialMediaMentions(politician, sourceConfig);
      politicianDataMap.set(politician.id, { headlines, socialMentions });
    } catch (err) {
      console.warn(`  ⚠ Data fetch failed for ${politician.name}: ${err.message}`);
      // Continue collecting failures so we can fail explicitly after phase 1.
      politicianDataMap.set(politician.id, { headlines: [], socialMentions: [] });
      fetchFailures.push({ politicianId: politician.id, message: err.message });
    }
  }

  if (fetchFailures.length > MAX_FETCH_FAILURES) {
    const sample = fetchFailures
      .slice(0, 5)
      .map((f) => `${f.politicianId}: ${f.message}`)
      .join("; ");
    throw new Error(
      `Data fetch failures (${fetchFailures.length}) exceeded PIPELINE_MAX_FETCH_FAILURES=${MAX_FETCH_FAILURES}. Sample: ${sample}`
    );
  }
  if (fetchFailures.length > 0) {
    console.warn(
      `  ⚠ Continuing with ${fetchFailures.length} tolerated fetch failure(s) because PIPELINE_MAX_FETCH_FAILURES=${MAX_FETCH_FAILURES}`
    );
  }

  console.log(
    `  Fetched data for ${politicianDataMap.size} politicians (${fetchFailures.length} partial failures)`
  );

  // ── Phase 0.5: Fetch structured parliamentary data (OpenKnesset) ────
  console.log("\nPhase 0.5: Fetching structured parliamentary data...");
  clearOknessetCache();
  const oknessetMap = new Map();
  const oknessetConfig = sourceConfig.openKnesset;

  if (oknessetConfig?.memberIdMap && Object.keys(oknessetConfig.memberIdMap).length > 0) {
    const oknessetResults = await Promise.allSettled(
      POLITICIANS.map((p) => fetchParliamentaryData(p.id, oknessetConfig))
    );
    let okHits = 0;
    for (let i = 0; i < POLITICIANS.length; i++) {
      const p = POLITICIANS[i];
      const result = oknessetResults[i];
      const data = result.status === "fulfilled" ? result.value : null;
      oknessetMap.set(p.id, data);
      if (data) okHits++;
    }
    console.log(`  → OpenKnesset: ${okHits}/${POLITICIANS.length} politicians with data`);
  } else {
    console.log("  → OpenKnesset: skipped (no memberIdMap configured in sources.config.json)");
    for (const p of POLITICIANS) oknessetMap.set(p.id, null);
  }

  // ── Phase 2: Batch-score all politicians via OpenAI Codex CLI ───────
  console.log("\nPhase 2: Scoring via OpenAI Codex CLI...");
  const llmResults = await batchScoreAllPoliticians(
    POLITICIANS,
    politicianDataMap,
    oknessetMap,
    PROMISES_DB
  );

  if (llmResults.length !== POLITICIANS.length) {
    console.warn(
      `  ⚠ LLM result count mismatch: expected ${POLITICIANS.length}, got ${llmResults.length} — deduplicating by politician_id`
    );
  }

  // Build a lookup by politician_id for fast matching
  const resultMap = new Map();
  for (const r of llmResults) {
    if (r.politician_id) {
      resultMap.set(r.politician_id, r);
    }
  }

  if (resultMap.size !== POLITICIANS.length) {
    const missing = POLITICIANS.filter((p) => !resultMap.has(p.id)).map((p) => p.id);
    throw new Error(
      `LLM returned ${resultMap.size} unique IDs, expected ${POLITICIANS.length}. Missing: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "..." : ""}`
    );
  }

  // ── Phase 3: Process results and build entries ──────────────────────
  console.log("\nPhase 3: Processing results...");
  const newEntries = [];
  const processFailures = [];

  for (const politician of POLITICIANS) {
    try {
      const llmResult = resultMap.get(politician.id);
      if (!llmResult) {
        throw new Error(`No LLM result found for politician_id: ${politician.id}`);
      }

      // Try 8-dim schema first; fall back to original 3-dim for resilience
      const parsed8 = parseLLMResponse8dim(llmResult);
      let llmData;
      if (parsed8.success) {
        llmData = parsed8.data;
      } else {
        const parsed3 = llmResponseSchema.safeParse(llmResult);
        if (!parsed3.success) {
          const errors = parsed3.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
          throw new Error(
            `LLM response validation failed for ${politician.id}: ${errors.join("; ")}`
          );
        }
        llmData = parsed3.data;
        console.warn(
          `  ⚠ ${politician.name}: 8-dim schema parse failed (${parsed8.errors?.join(", ")}), fell back to 3-dim`
        );
      }

      const {
        hostility_level: hostility,
        policy_approval: policy,
        media_amplification: amplification,
        chain_of_thought: chainOfThought,
        media_credibility_score = 0.5,
        tv_radio_mentions = 0,
        satire_mentions_count = 0,
        satire_tone = "neutral",
        field_activities_confirmed = 0,
        transparency_ethics_score = 0.5,
        lobbyist_meetings_count = 0,
        legislative_pro_socioeconomic_ratio = 0.5,
        agenda_setting_score = 0,
        flipflop_contradictions = 0,
        flipflop_promises_checked = 0,
      } = llmData;

      // Compute each dimension
      const okData = oknessetMap.get(politician.id) ?? null;

      const dim_public_sentiment = computePublicSentiment(hostility, policy, amplification);
      const dim_parliamentary_activity = computeParliamentaryActivity(okData);
      const dim_media_credibility = computeMediaCredibility(media_credibility_score, null);
      const dim_transparency_ethics = computeTransparencyEthics(
        transparency_ethics_score,
        lobbyist_meetings_count
      );
      const dim_field_activity = computeFieldActivity(field_activities_confirmed);
      const dim_satire_cultural_impact = computeSatireCulturalImpact(
        satire_mentions_count,
        satire_tone
      );
      const dim_legislative_quality = computeLegislativeQuality(
        legislative_pro_socioeconomic_ratio,
        okData?.mmm_requests_count ?? 0
      );
      const dim_flipflop_index = computeFlipFlopIndex(
        flipflop_contradictions,
        flipflop_promises_checked
      );
      const agenda_bonus = computeAgendaBonus(agenda_setting_score);

      const dims = {
        dim_public_sentiment,
        dim_parliamentary_activity,
        dim_media_credibility,
        dim_transparency_ethics,
        dim_field_activity,
        dim_satire_cultural_impact,
        dim_legislative_quality,
        dim_flipflop_index,
      };

      const overallScore = computeOverallScore8dim(dims, politician.wing, agenda_bonus);
      const data = politicianDataMap.get(politician.id) || { headlines: [], socialMentions: [] };

      const entry = {
        date: today,
        politician_id: politician.id,
        name: politician.name,
        party: politician.party,
        wing: politician.wing,
        sector: politician.sector,
        role: politician.role || "mk",
        hostility_level: hostility,
        policy_approval: policy,
        media_amplification: amplification,
        overall_score: overallScore,
        chain_of_thought: chainOfThought,
        news_sentiment: parseFloat((((policy + 1) / 2) * 10).toFixed(1)),
        social_sentiment: parseFloat(((1 - hostility) * 10).toFixed(1)),
        media_volume: parseFloat((amplification * 10).toFixed(1)),
        // 8-dimension scores
        dim_public_sentiment: parseFloat(dim_public_sentiment.toFixed(3)),
        dim_parliamentary_activity:
          dim_parliamentary_activity != null
            ? parseFloat(dim_parliamentary_activity.toFixed(3))
            : null,
        dim_media_credibility: parseFloat(dim_media_credibility.toFixed(3)),
        dim_transparency_ethics: parseFloat(dim_transparency_ethics.toFixed(3)),
        dim_field_activity: parseFloat(dim_field_activity.toFixed(3)),
        dim_satire_cultural_impact: parseFloat(dim_satire_cultural_impact.toFixed(3)),
        dim_legislative_quality: parseFloat(dim_legislative_quality.toFixed(3)),
        dim_flipflop_index:
          dim_flipflop_index != null ? parseFloat(dim_flipflop_index.toFixed(3)) : null,
        // Agenda bonus
        agenda_setting_score,
        agenda_bonus: parseFloat(agenda_bonus.toFixed(3)),
        // Raw LLM sub-fields
        media_credibility_llm: parseFloat(media_credibility_score.toFixed(3)),
        media_credibility_factcheck: null,
        tv_radio_mentions,
        satire_mentions_count,
        satire_tone,
        field_activities_confirmed,
        transparency_ethics_score: parseFloat(transparency_ethics_score.toFixed(3)),
        lobbyist_meetings_count,
        // Parliamentary sub-fields
        parl_attendance_rate: okData?.attendance_rate ?? null,
        parl_committee_rate: okData?.committee_rate ?? null,
        parl_initiative_score: okData?.initiative_score ?? null,
        parl_data_source: okData ? "openKnesset" : null,
        // Legislative sub-fields
        legislative_pro_socioeconomic: parseFloat(legislative_pro_socioeconomic_ratio.toFixed(3)),
        mmm_requests_count: okData?.mmm_requests_count ?? null,
        // Flip-flop sub-fields
        flipflop_contradictions,
        flipflop_promises_checked,
        // Source data
        news_headlines: data.headlines,
        social_mentions: data.socialMentions,
      };

      // Validate with original schema (core fields only) — 8-dim fields are extras
      const validation = dailyEntrySchema.safeParse(entry);
      if (!validation.success) {
        const errors = validation.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Entry validation failed: ${errors}`);
      }

      // Merge validated core with the extended 8-dim fields
      newEntries.push({ ...entry, ...validation.data });
    } catch (err) {
      console.error(`  ✗ Failed to process ${politician.name}: ${err.message}`);
      processFailures.push(politician.name);
    }
  }

  if (processFailures.length) {
    throw new Error(
      `Failed to process ${processFailures.length} politician(s): ${processFailures.join(", ")}`
    );
  }

  if (newEntries.length !== EXPECTED_POLITICIAN_COUNT) {
    throw new Error(
      `Entry count mismatch after processing: expected ${EXPECTED_POLITICIAN_COUNT}, got ${newEntries.length}`
    );
  }

  // Apply wing-relative normalization to parliamentary activity and legislative quality
  applyWingRelativeNorm(newEntries, "dim_parliamentary_activity");
  applyWingRelativeNorm(newEntries, "dim_legislative_quality");

  // Recompute overall score after dimension normalization to keep overall and dim_* in sync.
  for (const entry of newEntries) {
    entry.overall_score = computeOverallScore8dim(
      {
        dim_public_sentiment: entry.dim_public_sentiment,
        dim_parliamentary_activity: entry.dim_parliamentary_activity,
        dim_media_credibility: entry.dim_media_credibility,
        dim_transparency_ethics: entry.dim_transparency_ethics,
        dim_field_activity: entry.dim_field_activity,
        dim_satire_cultural_impact: entry.dim_satire_cultural_impact,
        dim_legislative_quality: entry.dim_legislative_quality,
        dim_flipflop_index: entry.dim_flipflop_index,
      },
      entry.wing,
      entry.agenda_bonus ?? 0
    );
  }

  // ── Phase 3.5: Aggregate parties ──────────────────────────────────
  console.log("\nPhase 3.5: Aggregating party scores...");
  const partyEntries = aggregateParties(newEntries, today);
  console.log(`  → ${partyEntries.length} parties aggregated`);

  // ── Phase 3.6: Validate ─────────────────────────────────────────────
  console.log("\nPhase 3.6: Validating data quality...");
  let existingSummary = [];
  try {
    existingSummary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf-8"));
  } catch {
    // No historical data yet
  }
  // Last 7 days of history for temporal checks
  const recentDates = [...new Set(existingSummary.map((r) => r.date))].sort().slice(-7);
  const recentHistory = existingSummary.filter((r) => recentDates.includes(r.date));

  const allWarnings = [
    ...validateChainOfThought(newEntries),
    ...validateTemporalConsistency(newEntries, recentHistory),
    ...detectOutliers(newEntries),
    ...validatePartyConsistency(partyEntries),
    ...validateDimensionConsistency(newEntries, {
      requireParliamentaryActivity: Object.keys(oknessetConfig?.memberIdMap ?? {}).length > 0,
    }),
  ];

  if (allWarnings.length) {
    console.warn(`  ⚠ ${allWarnings.length} validation warnings:`);
    for (const w of allWarnings) {
      console.warn(`    ${w}`);
    }
    // Log to drift_log.json
    const driftLogPath = path.join(DATA_DIR, "drift_log.json");
    let driftLog = [];
    try {
      driftLog = JSON.parse(fs.readFileSync(driftLogPath, "utf-8"));
    } catch {
      // Starting fresh
    }
    driftLog.push({ date: today, warnings: allWarnings, timestamp: new Date().toISOString() });
    // Keep last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    driftLog = driftLog.filter((e) => new Date(e.timestamp) > cutoff);
    fs.writeFileSync(driftLogPath, JSON.stringify(driftLog, null, 2));
  } else {
    console.log("  ✓ All validation checks passed");
  }

  // ── Phase 4: Write artifacts ────────────────────────────────────────
  console.log("\nPhase 4: Writing artifacts...");
  appendToSummary(newEntries, today);
  writeDetailFile(newEntries, today);
  writePartySummary(partyEntries, today);
  pruneOldDetails();

  console.log(`\n✅ Pipeline complete for ${today}`);
}

// ── CLI Flag Handling ──────────────────────────────────────────────────
// --validate: Run golden dataset evaluation only (no daily score generation)
function isDirectExecution() {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && path.resolve(entrypoint) === __filename);
}

if (isDirectExecution()) {
  if (process.argv.includes("--validate")) {
    import("./validateDrift.js").catch((err) => {
      console.error("Drift validation failed:", err);
      process.exit(1);
    });
  } else {
    main().catch((err) => {
      console.error("Pipeline failed:", err);
      process.exit(1);
    });
  }
}

// ── Test Exports ──────────────────────────────────────────────────────
// Internal functions exported for unit testing only.

export {
  normalizeText,
  dedupeStrings,
  decodeHtmlEntities,
  parseRssItems,
  renderSearchTemplate,
  parsePositiveInt,
  getCurrentDateString,
  appendToSummary,
  writeDetailFile,
  writePartySummary,
  pruneOldDetails,
};
