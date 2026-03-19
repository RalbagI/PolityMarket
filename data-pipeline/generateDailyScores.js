import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import parseLLMResponse, { dailyEntrySchema, summaryRowSchema } from "./lib/parseLLMResponse.js";
import retry from "./lib/retry.js";
import computeOverallScore from "./lib/computeScore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────
const POLITICIANS = [
  // ── Likud (32) ───────────────────────────────────────────────────────
  {
    id: "benjamin-netanyahu",
    name: "Benjamin Netanyahu",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "yariv-levin", name: "Yariv Levin", party: "Likud", wing: "right", sector: "secular" },
  { id: "yoav-gallant", name: "Yoav Gallant", party: "Likud", wing: "right", sector: "secular" },
  { id: "miri-regev", name: "Miri Regev", party: "Likud", wing: "right", sector: "secular" },
  { id: "nir-barkat", name: "Nir Barkat", party: "Likud", wing: "right", sector: "secular" },
  { id: "amir-ohana", name: "Amir Ohana", party: "Likud", wing: "right", sector: "secular" },
  { id: "eli-cohen", name: "Eli Cohen", party: "Likud", wing: "right", sector: "secular" },
  { id: "yisrael-katz", name: "Yisrael Katz", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "yuli-edelstein",
    name: "Yuli Edelstein",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "shlomo-karhi", name: "Shlomo Karhi", party: "Likud", wing: "right", sector: "secular" },
  { id: "zeev-elkin", name: "Zeev Elkin", party: "Likud", wing: "right", sector: "secular" },
  { id: "avi-dichter", name: "Avi Dichter", party: "Likud", wing: "right", sector: "secular" },
  { id: "danny-danon", name: "Danny Danon", party: "Likud", wing: "right", sector: "secular" },
  { id: "ofir-akunis", name: "Ofir Akunis", party: "Likud", wing: "right", sector: "secular" },
  { id: "david-bitan", name: "David Bitan", party: "Likud", wing: "right", sector: "secular" },
  { id: "fateen-mulla", name: "Fateen Mulla", party: "Likud", wing: "right", sector: "druze" },
  { id: "david-amsalem", name: "David Amsalem", party: "Likud", wing: "right", sector: "secular" },
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
  { id: "george-ilatov", name: "George Ilatov", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "avichay-buaron",
    name: "Avichay Buaron",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "tsega-melaku", name: "Tsega Melaku", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "shelly-tal-meron",
    name: "Shelly Tal Meron",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "ami-daniel", name: "Ami Daniel", party: "Likud", wing: "right", sector: "secular" },
  {
    id: "eliyahu-revivo",
    name: "Eliyahu Revivo",
    party: "Likud",
    wing: "right",
    sector: "secular",
  },
  { id: "keti-shitrit", name: "Keti Shitrit", party: "Likud", wing: "right", sector: "secular" },

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
  {
    id: "orna-barbivai",
    name: "Orna Barbivai",
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
  { id: "idan-roll", name: "Idan Roll", party: "Yesh Atid", wing: "center", sector: "secular" },
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
  { id: "nira-shpak", name: "Nira Shpak", party: "Yesh Atid", wing: "center", sector: "secular" },
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
  { id: "tomer-glam", name: "Tomer Glam", party: "Yesh Atid", wing: "center", sector: "secular" },
  { id: "ben-simon", name: "Ben Simon", party: "Yesh Atid", wing: "center", sector: "secular" },
  {
    id: "limor-magen-telem",
    name: "Limor Magen Telem",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },
  {
    id: "rachel-azaria",
    name: "Rachel Azaria",
    party: "Yesh Atid",
    wing: "center",
    sector: "secular",
  },

  // ── National Unity (12) ─────────────────────────────────────────────
  {
    id: "benny-gantz",
    name: "Benny Gantz",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "gadi-eisenkot",
    name: "Gadi Eisenkot",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "gideon-saar",
    name: "Gideon Sa'ar",
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
    id: "sharren-haskel",
    name: "Sharren Haskel",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "matan-kahana",
    name: "Matan Kahana",
    party: "National Unity",
    wing: "center",
    sector: "religious",
  },
  {
    id: "chili-tropper",
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
    id: "yifat-shasha-biton",
    name: "Yifat Shasha-Biton",
    party: "National Unity",
    wing: "center",
    sector: "secular",
  },
  {
    id: "zeev-benjamin-begin",
    name: "Ze'ev Benjamin Begin",
    party: "National Unity",
    wing: "center",
    sector: "secular",
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
  {
    id: "yitzhak-cohen-shas",
    name: "Yitzhak Cohen",
    party: "Shas",
    wing: "right",
    sector: "haredi",
  },
  { id: "moshe-abutbul", name: "Moshe Abutbul", party: "Shas", wing: "right", sector: "haredi" },
  { id: "ariel-atias", name: "Ariel Atias", party: "Shas", wing: "right", sector: "haredi" },

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
    id: "yisrael-eichler",
    name: "Yisrael Eichler",
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

  // ── Religious Zionism (7) ───────────────────────────────────────────
  {
    id: "bezalel-smotrich",
    name: "Bezalel Smotrich",
    party: "Religious Zionism",
    wing: "right",
    sector: "religious",
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
    id: "limor-son-har-melech",
    name: "Limor Son Har-Melech",
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
    id: "almog-cohen",
    name: "Almog Cohen",
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
    id: "limor-widman-yosef",
    name: "Limor Widman-Yosef",
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
  { id: "mazen-ghanaim", name: "Mazen Ghanaim", party: "Ra'am", wing: "arab", sector: "arab" },
  {
    id: "atta-abu-medeghem",
    name: "Atta Abu Medeghem",
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
    id: "youssef-atauna",
    name: "Youssef Atauna",
    party: "Hadash-Ta'al",
    wing: "arab",
    sector: "arab",
  },

  // ── Labor (4) ──────────────────────────────────────────────────────
  { id: "merav-michaeli", name: "Merav Michaeli", party: "Labor", wing: "left", sector: "secular" },
  { id: "naama-lazimi", name: "Naama Lazimi", party: "Labor", wing: "left", sector: "secular" },
  { id: "gilad-kariv", name: "Gilad Kariv", party: "Labor", wing: "left", sector: "secular" },
  { id: "efrat-rayten", name: "Efrat Rayten", party: "Labor", wing: "left", sector: "secular" },

  // ── Democrats (1) ─────────────────────────────────────────────────
  { id: "yair-golan", name: "Yair Golan", party: "Democrats", wing: "left", sector: "secular" },
];

const DATA_DIR = path.resolve(__dirname, "../public/data");
const SUMMARY_PATH = path.join(DATA_DIR, "timeseries_summary.json");
const DETAILS_DIR = path.join(DATA_DIR, "details");
const RETENTION_DAYS = 90;
const PIPELINE_TIMEZONE = process.env.TZ || "Asia/Jerusalem";
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
  /\/+$/,
  ""
);
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const OLLAMA_TIMEOUT_MS = parsePositiveInt(process.env.OLLAMA_TIMEOUT_MS, 120000);
const SOURCE_TIMEOUT_MS = parsePositiveInt(process.env.SOURCE_TIMEOUT_MS, 20000);
const EXPECTED_POLITICIAN_COUNT = parsePositiveInt(
  process.env.PIPELINE_EXPECTED_POLITICIAN_COUNT,
  120
);
const SOURCES_CONFIG_PATH = process.env.PIPELINE_SOURCES_PATH
  ? path.resolve(process.env.PIPELINE_SOURCES_PATH)
  : path.join(__dirname, "sources.config.json");

// computeOverallScore imported from ./lib/computeScore.js

const rssFeedCache = new Map();
const redditFeedCache = new Map();
let ollamaReadyChecked = false;
const OLLAMA_JSON_SCHEMA = {
  type: "object",
  required: ["chain_of_thought", "hostility_level", "policy_approval", "media_amplification"],
  properties: {
    chain_of_thought: { type: "string" },
    hostility_level: { type: "number", minimum: 0, maximum: 1 },
    policy_approval: { type: "number", minimum: -1, maximum: 1 },
    media_amplification: { type: "number", minimum: 0, maximum: 1 },
  },
  additionalProperties: false,
};

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

function extractLikelyJson(raw) {
  const input = String(raw ?? "");
  const start = input.indexOf("{");
  const end = input.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return input;
  }
  return input.slice(start, end + 1);
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

async function ensureOllamaReady() {
  if (ollamaReadyChecked) {
    return;
  }

  const payload = await fetchJson(`${OLLAMA_BASE_URL}/api/tags`, OLLAMA_TIMEOUT_MS);
  const available = (payload?.models ?? []).map((m) => m.name);
  if (!available.includes(OLLAMA_MODEL)) {
    throw new Error(
      `Ollama model ${OLLAMA_MODEL} not found at ${OLLAMA_BASE_URL}. Available: ${available.join(", ")}`
    );
  }

  ollamaReadyChecked = true;
}

// ── LLM System Prompt ─────────────────────────────────────────────────
// Loaded from prompts/system-prompt.txt for easy review and iteration.
//
// ── Hebrew NLP Model Recommendations ──────────────────────────────────
// For production: DictaLM 2.0, Hebrew_Nemo, HeBERT, DictaBERT.

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts", "system-prompt.txt"),
  "utf-8"
);

// ── Build User Prompt ──────────────────────────────────────────────────
function buildUserPrompt(politicianName, party, headlines, socialMentions) {
  const headlineBlock = headlines.length
    ? headlines.map((h) => `- ${h}`).join("\n")
    : "- No matched headlines found in configured sources.";

  const mentionBlock = socialMentions
    .map((m) => {
      let entry = `- "${m.text}"`;
      if (m.speaker_metadata?.known_satirist) {
        entry += ` [Speaker: known satirist]`;
      }
      if (m.thread_context?.length) {
        entry += "\n  Thread context: " + m.thread_context.map((t) => `"${t}"`).join(" → ");
      }
      return entry;
    })
    .join("\n");

  return `Politician: ${politicianName} (${party})

Recent Headlines:
${headlineBlock}

Social Media Mentions (with thread context where available):
${mentionBlock}

Analyze this politician's current public standing. Remember:
1. Write your chain_of_thought analysis FIRST
2. Then output the three dimensional scores
3. Do NOT output an overall_score`;
}

// ── LLM Scoring Function ──────────────────────────────────────────────
async function scorePoliticianWithLLM(politicianName, party, headlines, socialMentions) {
  const userPrompt = buildUserPrompt(politicianName, party, headlines, socialMentions);

  const payload = {
    model: OLLAMA_MODEL,
    stream: false,
    format: OLLAMA_JSON_SCHEMA,
    options: { temperature: 0 },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama chat failed (${response.status}): ${body.slice(0, 250)}`);
  }

  const raw = await response.json();
  const content = raw?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Ollama response missing message.content");
  }

  try {
    return parseLLMResponse(content);
  } catch (err) {
    const repaired = extractLikelyJson(content);
    if (repaired !== content) {
      return parseLLMResponse(repaired);
    }
    throw err;
  }
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
  console.log(`\n📊 PolityMarket Daily Pipeline — ${today}\n`);

  if (POLITICIANS.length !== EXPECTED_POLITICIAN_COUNT) {
    throw new Error(
      `Politician roster mismatch: expected ${EXPECTED_POLITICIAN_COUNT}, got ${POLITICIANS.length}`
    );
  }

  const sourceConfig = loadSourceConfig();
  await ensureOllamaReady();

  const newEntries = [];
  const failures = [];
  for (const politician of POLITICIANS) {
    console.log(`\nProcessing: ${politician.name} (${politician.party})`);
    try {
      const headlines = await fetchRSSHeadlines(politician, sourceConfig);
      const socialMentions = await fetchSocialMediaMentions(politician, sourceConfig);
      const llmResult = await retry(
        () => scorePoliticianWithLLM(politician.name, politician.party, headlines, socialMentions),
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 30000,
          onRetry: (err, attempt, delay) => {
            console.warn(
              `  ⟳ Retry ${attempt}/3 for ${politician.name} in ${Math.round(delay)}ms: ${err.message}`
            );
          },
        }
      );

      const overallScore = computeOverallScore(
        llmResult.hostility_level,
        llmResult.policy_approval,
        llmResult.media_amplification
      );

      const entry = {
        date: today,
        politician_id: politician.id,
        name: politician.name,
        party: politician.party,
        hostility_level: llmResult.hostility_level,
        policy_approval: llmResult.policy_approval,
        media_amplification: llmResult.media_amplification,
        overall_score: overallScore,
        chain_of_thought: llmResult.chain_of_thought,
        news_sentiment: parseFloat((((llmResult.policy_approval + 1) / 2) * 10).toFixed(1)),
        social_sentiment: parseFloat(((1 - llmResult.hostility_level) * 10).toFixed(1)),
        media_volume: parseFloat((llmResult.media_amplification * 10).toFixed(1)),
        news_headlines: headlines,
        social_mentions: socialMentions,
      };

      // Validate entry against schema before writing
      const validation = dailyEntrySchema.safeParse(entry);
      if (!validation.success) {
        const errors = validation.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Entry validation failed: ${errors}`);
      }

      newEntries.push(validation.data);

      console.log(
        `  → Hostility: ${llmResult.hostility_level} | Policy: ${llmResult.policy_approval} | Amplification: ${llmResult.media_amplification}`
      );
      console.log(`  → Overall score (deterministic): ${overallScore}`);
    } catch (err) {
      console.error(`  ✗ Failed to process ${politician.name}: ${err.message}`);
      failures.push(politician.name);
    }
  }

  if (failures.length) {
    throw new Error(`Failed to process ${failures.length} politician(s): ${failures.join(", ")}`);
  }

  if (newEntries.length !== EXPECTED_POLITICIAN_COUNT) {
    throw new Error(
      `Entry count mismatch after processing: expected ${EXPECTED_POLITICIAN_COUNT}, got ${newEntries.length}`
    );
  }

  console.log("\nWriting artifacts...");
  appendToSummary(newEntries, today);
  writeDetailFile(newEntries, today);
  pruneOldDetails();

  console.log(`\n✅ Pipeline complete for ${today}`);
}

// ── CLI Flag Handling ──────────────────────────────────────────────────
// --validate: Run golden dataset evaluation only (no daily score generation)
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
