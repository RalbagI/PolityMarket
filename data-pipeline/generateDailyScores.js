import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dailyEntrySchema, llmResponseSchema, summaryRowSchema } from "./lib/parseLLMResponse.js";
import retry from "./lib/retry.js";
import computeOverallScore from "./lib/computeScore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // ── National Unity (8) ────────────────────────────────────────────
  {
    id: "benny-gantz",
    name: "Benny Gantz",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "pnina-tamano-shata",
    name: "Pnina Tamano-Shata",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "hili-tropper",
    name: "Hili Tropper",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "orit-farkash-hacohen",
    name: "Orit Farkash-Hacohen",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "alon-schuster",
    name: "Alon Schuster",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "michael-biton",
    name: "Michael Biton",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "eitan-ginzburg",
    name: "Eitan Ginzburg",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "yael-ron-ben-moshe",
    name: "Yael Ron Ben Moshe",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  // National Unity – not currently serving as MKs
  {
    id: "gadi-eisenkot",
    name: "Gadi Eisenkot",
    party: "National Unity",
    wing: "center",
    sector: "secular",
    role: "politician",
  },
  {
    id: "matan-kahana",
    name: "Matan Kahana",
    party: "National Unity",
    wing: "center",
    sector: "religious",
    role: "politician",
  },
  {
    id: "yoaz-hendel",
    name: "Yoaz Hendel",
    party: "National Unity",
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

  // ── Labor (4) ──────────────────────────────────────────────────────
  { id: "merav-michaeli", name: "Merav Michaeli", party: "Labor", wing: "left", sector: "secular" },
  { id: "naama-lazimi", name: "Naama Lazimi", party: "Labor", wing: "left", sector: "secular" },
  { id: "gilad-kariv", name: "Gilad Kariv", party: "Labor", wing: "left", sector: "secular" },
  {
    id: "efrat-rayten",
    name: "Efrat Rayten Marom",
    party: "Labor",
    wing: "left",
    sector: "secular",
  },

  // ── HaYamin HaMamlakhti (4 MKs + 1 minister) ─────────────────────
  {
    id: "gideon-saar",
    name: "Gideon Sa'ar",
    party: "HaYamin HaMamlakhti",
    wing: "right",
    sector: "secular",
    role: "minister",
  },
  {
    id: "zeev-elkin",
    name: "Ze'ev Elkin",
    party: "HaYamin HaMamlakhti",
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

  // ── Democrats (1) ─────────────────────────────────────────────────
  {
    id: "yair-golan",
    name: "Yair Golan",
    party: "Democrats",
    wing: "left",
    sector: "secular",
    role: "politician",
  },

  // ── Independent / Not currently serving ───────────────────────────
  {
    id: "naftali-bennett",
    name: "Naftali Bennett",
    party: "Independent",
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
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "opus";
const CLAUDE_TIMEOUT_MS = parsePositiveInt(process.env.CLAUDE_TIMEOUT_MS, 300000);
const CLAUDE_MAX_BATCH = parsePositiveInt(process.env.CLAUDE_MAX_BATCH, 135);
const CLAUDE_MAX_PROMPT_CHARS = parseNonNegativeInt(process.env.CLAUDE_MAX_PROMPT_CHARS, 350000);
const SOURCE_TIMEOUT_MS = parsePositiveInt(process.env.SOURCE_TIMEOUT_MS, 20000);
const EXPECTED_POLITICIAN_COUNT = parsePositiveInt(
  process.env.PIPELINE_EXPECTED_POLITICIAN_COUNT,
  135
);
const MAX_FETCH_FAILURES = parseNonNegativeInt(process.env.PIPELINE_MAX_FETCH_FAILURES, 0);
const SOURCES_CONFIG_PATH = process.env.PIPELINE_SOURCES_PATH
  ? path.resolve(process.env.PIPELINE_SOURCES_PATH)
  : path.join(__dirname, "sources.config.json");

// computeOverallScore imported from ./lib/computeScore.js

const rssFeedCache = new Map();
const redditFeedCache = new Map();

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

function buildSearchTerms(politician) {
  const tokenTerms = politician.name
    .split(/[\s\-']/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
  const terms = dedupeStrings([politician.name, politician.id.replace(/-/g, " "), ...tokenTerms]);
  return terms.map((term) => normalizeText(term));
}

function includesPolitician(text, searchTerms) {
  const normalized = normalizeText(text);
  return searchTerms.some((term) => normalized.includes(term));
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

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PolityMarketPipeline/1.0 (+https://github.com/RalbagI/PolityMarket)",
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

function renderSearchTemplate(template, politician) {
  const quotedName = `"${politician.name}"`;
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

  for (const subreddit of socialConfig.redditSubreddits) {
    try {
      const posts = await getRedditPosts(subreddit, socialConfig.maxPostsPerSubreddit);
      successfulSources++;
      for (const post of posts) {
        const combined = `${post.title} ${post.body}`;
        if (!includesPolitician(combined, searchTerms)) {
          continue;
        }
        matches.push({
          text: post.body ? `${post.title} — ${post.body.slice(0, 240)}` : post.title,
          thread_context: post.permalink ? [`Source: ${post.permalink}`] : [],
          speaker_metadata: {
            handle: `@${post.author}`,
            known_satirist: /satire|parody|meme/i.test(`${post.author} ${combined}`),
          },
        });
      }
    } catch (err) {
      failedSources++;
      console.warn(`[Social] ${politician.name}: failed subreddit (${subreddit}) — ${err.message}`);
    }
  }

  if (successfulSources === 0) {
    throw new Error(
      `[Social] ${politician.name}: all configured subreddits failed (${failedSources} failures)`
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

// ── Batched Claude CLI Scoring ───────────────────────────────────────
// Instead of calling an LLM per-politician, we batch politicians into
// fewer prompts and call Claude CLI for each batch.

export function buildBatchedPrompt(politicians, politicianDataMap) {
  let prompt = `${SYSTEM_PROMPT}

---

Score ALL ${politicians.length} politicians below. For EACH, output a JSON object with:
- politician_id: the ID provided
- chain_of_thought: Hebrew analysis (1-2 sentences)
- hostility_level: 0.0-1.0
- policy_approval: -1.0 to 1.0
- media_amplification: 0.0-1.0

Respond with a raw JSON array of ${politicians.length} objects. No markdown. No code fences.
"No matched" = neutral scores (0.0, 0.0, 0.0). Do NOT output overall_score.

---
`;

  for (let i = 0; i < politicians.length; i++) {
    const p = politicians[i];
    const data = politicianDataMap.get(p.id) || { headlines: [], socialMentions: [] };

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
                entry += "\n  Thread context: " + m.thread_context.map((t) => `"${t}"`).join(" → ");
              }
              return entry;
            })
            .join("\n")
        : "No matched social mentions";

    prompt += `
[${i + 1}] ${p.id} | ${p.name} (${p.party})
Headlines:
${headlineBlock}
Social:
${mentionBlock}
`;
  }

  return prompt;
}

export function parseClaudeCliOutput(rawOutput) {
  let response;
  try {
    response = JSON.parse(rawOutput);
  } catch (err) {
    throw new Error(`Failed to parse Claude CLI JSON envelope: ${err.message}`);
  }

  if (response?.is_error) {
    throw new Error(`Claude CLI error: ${response.result || "unknown"}`);
  }

  const content = typeof response?.result === "string" ? response.result : "";
  // Strip markdown code fences if present
  const cleaned = content
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON array from response
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } else {
      throw new Error(`Failed to parse Claude response as JSON: ${e.message}`);
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Claude response is not an array (got ${typeof parsed})`);
  }

  return {
    results: parsed,
    durationMs: response?.duration_ms,
    totalCostUsd: response?.total_cost_usd,
  };
}

function callClaudeCLI(prompt) {
  const env = { ...process.env };
  delete env.CLAUDECODE; // Allow nested CLI invocation

  const raw = execFileSync("claude", ["-p", "--model", CLAUDE_MODEL, "--output-format", "json"], {
    input: prompt,
    env,
    maxBuffer: 20 * 1024 * 1024,
    timeout: CLAUDE_TIMEOUT_MS,
    encoding: "utf-8",
  });

  const parsed = parseClaudeCliOutput(raw);
  const duration = Number.isFinite(parsed.durationMs) ? parsed.durationMs : "n/a";
  const cost =
    typeof parsed.totalCostUsd === "number" ? `$${parsed.totalCostUsd.toFixed(4)}` : "n/a";
  console.log(`  Claude CLI: ${duration}ms, ${cost}`);
  return parsed.results;
}

export function shouldRetryClaudeBatchError(err) {
  const msg = String(err?.message || "").toLowerCase();

  // Permanent environment/configuration failures should fail fast.
  if (msg.includes("enoent") && msg.includes("claude")) {
    return false;
  }
  if (
    msg.includes("claude cli error") &&
    (msg.includes("authentication") ||
      msg.includes("api key") ||
      msg.includes("not authorized") ||
      msg.includes("permission denied") ||
      msg.includes("invalid model") ||
      msg.includes("model not found"))
  ) {
    return false;
  }

  // Retry parse errors as the model may return valid JSON on a subsequent attempt.
  return true;
}

export function splitPoliticiansIntoBatches(
  politicians,
  politicianDataMap,
  maxBatchSize,
  maxPromptChars
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
    return buildBatchedPrompt(batch, politicianDataMap).length > maxPromptChars;
  };

  for (const politician of politicians) {
    if (current.length === 0) {
      current = [politician];
      if (exceedsPromptBudget(current)) {
        console.warn(
          `  ⚠ Single-politician prompt exceeds CLAUDE_MAX_PROMPT_CHARS for ${politician.id}`
        );
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
        console.warn(
          `  ⚠ Single-politician prompt exceeds CLAUDE_MAX_PROMPT_CHARS for ${politician.id}`
        );
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

async function batchScoreAllPoliticians(politicians, politicianDataMap) {
  const batchSize = Math.min(CLAUDE_MAX_BATCH, Math.max(1, politicians.length));
  const batches = splitPoliticiansIntoBatches(
    politicians,
    politicianDataMap,
    batchSize,
    CLAUDE_MAX_PROMPT_CHARS
  );

  const allResults = [];

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    console.log(
      `\n  Scoring batch ${b + 1}/${batches.length} (${batch.length} politicians) via Claude ${CLAUDE_MODEL}...`
    );

    const prompt = buildBatchedPrompt(batch, politicianDataMap);
    console.log(`  Prompt size: ${prompt.length} chars`);

    const results = await retry(() => callClaudeCLI(prompt), {
      maxRetries: 2,
      initialDelay: 5000,
      maxDelay: 30000,
      shouldRetry: shouldRetryClaudeBatchError,
      onRetry: (err, attempt, delay) => {
        console.warn(
          `  ⟳ Retry ${attempt}/2 for batch ${b + 1} in ${Math.round(delay)}ms: ${err.message}`
        );
      },
    });

    allResults.push(...results);
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
      role: entry.role,
      overall_score: entry.overall_score,
      media_volume: entry.media_volume,
    };
    const validated = summaryRowSchema.safeParse(summaryRow);
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
    role: e.role,
    hostility_level: e.hostility_level,
    policy_approval: e.policy_approval,
    media_amplification: e.media_amplification,
    news_sentiment: e.news_sentiment,
    social_sentiment: e.social_sentiment,
    media_volume: e.media_volume,
    overall_score: e.overall_score,
    chain_of_thought: e.chain_of_thought,
    news_headlines: Array.isArray(e.news_headlines) ? e.news_headlines : [],
    social_mentions: Array.isArray(e.social_mentions) ? e.social_mentions : [],
  }));
  const detailPath = path.join(DETAILS_DIR, `${today}.json`);
  fs.writeFileSync(detailPath, JSON.stringify(detailEntries, null, 2));
  console.log(`  → Detail: ${detailPath}`);
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
  console.log(`   LLM: Claude ${CLAUDE_MODEL} (batched)\n`);

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

  // ── Phase 2: Batch-score all politicians via Claude CLI ─────────────
  console.log("\nPhase 2: Scoring via Claude CLI...");
  const llmResults = await batchScoreAllPoliticians(POLITICIANS, politicianDataMap);

  if (llmResults.length !== POLITICIANS.length) {
    throw new Error(
      `LLM result count mismatch: expected ${POLITICIANS.length}, got ${llmResults.length}`
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

      const parsedLLM = llmResponseSchema.safeParse(llmResult);
      if (!parsedLLM.success) {
        const errors = parsedLLM.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        throw new Error(
          `LLM response validation failed for ${politician.id}: ${errors.join("; ")}`
        );
      }

      const {
        hostility_level: hostility,
        policy_approval: policy,
        media_amplification: amplification,
        chain_of_thought: chainOfThought,
      } = parsedLLM.data;

      const overallScore = computeOverallScore(hostility, policy, amplification);
      const data = politicianDataMap.get(politician.id) || { headlines: [], socialMentions: [] };

      const entry = {
        date: today,
        politician_id: politician.id,
        name: politician.name,
        party: politician.party,
        role: politician.role || "mk",
        hostility_level: hostility,
        policy_approval: policy,
        media_amplification: amplification,
        overall_score: overallScore,
        chain_of_thought: chainOfThought,
        news_sentiment: parseFloat((((policy + 1) / 2) * 10).toFixed(1)),
        social_sentiment: parseFloat(((1 - hostility) * 10).toFixed(1)),
        media_volume: parseFloat((amplification * 10).toFixed(1)),
        news_headlines: data.headlines,
        social_mentions: data.socialMentions,
      };

      const validation = dailyEntrySchema.safeParse(entry);
      if (!validation.success) {
        const errors = validation.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Entry validation failed: ${errors}`);
      }

      newEntries.push(validation.data);
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

  // ── Phase 4: Write artifacts ────────────────────────────────────────
  console.log("\nPhase 4: Writing artifacts...");
  appendToSummary(newEntries, today);
  writeDetailFile(newEntries, today);
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
