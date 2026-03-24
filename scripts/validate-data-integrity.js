#!/usr/bin/env node

/**
 * Comprehensive CI data integrity validation.
 * Enforces 4 rules:
 *
 * 1. PARTY COMPLETENESS: party_summary.json must cover all parties in the roster
 * 2. POLITICIAN COMPLETENESS: roster must have all 120 MKs + extras, no duplicates,
 *    and summary data must match
 * 3. HEBREW ENFORCEMENT: all politician names, party names, and UI-facing text
 *    must have Hebrew translations (except site name "PolityMarket")
 * 4. AVATAR COVERAGE: every politician in the roster must have an avatar trait
 *    config (either hand-crafted or generated)
 *
 * Exit code 1 if any check fails.
 */

import fs from "fs";
import path from "path";
import process from "node:process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

// ── Load data ─────────────────────────────────────────────────────────

const pipelineSrcPath = path.join(repoRoot, "data-pipeline/generateDailyScores.js");
let pipelineSrc = "";
try {
  pipelineSrc = fs.readFileSync(pipelineSrcPath, "utf-8");
} catch {
  warn("generateDailyScores.js not found — roster fallback from source disabled");
}

const i18n = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "src/locales/he/translation.json"), "utf-8")
);

let summary = [];
try {
  summary = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "public/data/timeseries_summary.json"), "utf-8")
  );
} catch {
  warn("timeseries_summary.json not found or invalid — skipping data checks");
}

let partySummary = [];
try {
  partySummary = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "public/data/party_summary.json"), "utf-8")
  );
} catch {
  warn("party_summary.json not found — skipping party data checks");
}

function dedupeRoster(rows) {
  const byId = new Map();
  for (const row of rows) {
    if (!row?.id || !row?.name || !row?.party) continue;
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return [...byId.values()];
}

function loadRosterFromLatestDetails() {
  const detailsDir = path.join(repoRoot, "public/data/details");
  if (!fs.existsSync(detailsDir)) return [];

  const files = fs.readdirSync(detailsDir).filter((name) => name.endsWith(".json")).sort();
  if (!files.length) return [];

  const latest = files.at(-1);
  try {
    const rows = JSON.parse(fs.readFileSync(path.join(detailsDir, latest), "utf-8"));
    if (!Array.isArray(rows)) return [];
    return dedupeRoster(
      rows.map((row) => ({
        id: row.politician_id,
        name: row.name,
        party: row.party,
      }))
    );
  } catch {
    warn(`Failed to parse details roster file: ${latest}`);
    return [];
  }
}

function loadRosterFromPipelineSource(source) {
  if (!source) return [];
  const blocks = source.match(/\{[\s\S]*?\}/g) || [];
  const rows = [];

  for (const block of blocks) {
    const id = block.match(/\bid:\s*["']([^"']+)["']/)?.[1];
    const name = block.match(/\bname:\s*["']([^"']+)["']/)?.[1];
    const party = block.match(/\bparty:\s*["']([^"']+)["']/)?.[1];
    if (id && name && party) rows.push({ id, name, party });
  }

  return dedupeRoster(rows);
}

const detailsRoster = loadRosterFromLatestDetails();
let rosterSource = "public/data/details (latest)";
let roster = detailsRoster;

if (!roster.length) {
  roster = loadRosterFromPipelineSource(pipelineSrc);
  rosterSource = "data-pipeline/generateDailyScores.js (fallback parser)";
}

if (!roster.length) {
  fail("Unable to build roster from details data or pipeline source");
}

const rosterIds = roster.map((r) => r.id);
const rosterParties = [...new Set(roster.map((r) => r.party))].sort();

console.log(`\n🔍 Data Integrity Validation\n`);
console.log(`  Roster source: ${rosterSource}`);
console.log(`  Roster: ${roster.length} politicians, ${rosterParties.length} parties`);

// ── Check 1: Party Completeness ───────────────────────────────────────

console.log("\n📊 Check 1: Party Completeness");
let errSnap = errors.length;

if (partySummary.length) {
  const latestDate = [...new Set(partySummary.map((p) => p.date))].sort().pop();
  const latestParties = partySummary
    .filter((p) => p.date === latestDate)
    .map((p) => p.party)
    .sort();

  for (const party of rosterParties) {
    if (!latestParties.includes(party)) {
      fail(`Party "${party}" exists in roster but missing from party_summary.json (date: ${latestDate})`);
    }
  }

  if (errors.length === errSnap) {
    console.log(`  ✓ All ${rosterParties.length} parties present in party_summary.json`);
  }
} else {
  warn("Skipped — no party_summary.json");
}

// ── Check 2: Politician Completeness ──────────────────────────────────

console.log("\n👤 Check 2: Politician Completeness");
errSnap = errors.length;

// Check for duplicates in roster
const duplicateIds = rosterIds.filter((id, i) => rosterIds.indexOf(id) !== i);
if (duplicateIds.length) {
  fail(`Duplicate politician IDs in roster: ${duplicateIds.join(", ")}`);
}

// Check minimum count (120 MKs baseline)
if (roster.length < 120) {
  fail(`Roster has ${roster.length} politicians — expected at least 120 (all MKs)`);
}

// Check summary data matches roster
if (summary.length) {
  const latestDate = [...new Set(summary.map((r) => r.date))].sort().pop();
  const latestIds = new Set(summary.filter((r) => r.date === latestDate).map((r) => r.politician_id));

  const missingFromData = rosterIds.filter((id) => !latestIds.has(id));
  if (missingFromData.length) {
    fail(
      `${missingFromData.length} politician(s) in roster but missing from latest summary data: ${missingFromData.slice(0, 5).join(", ")}${missingFromData.length > 5 ? "..." : ""}`
    );
  }

  const extraInData = [...latestIds].filter((id) => !rosterIds.includes(id));
  if (extraInData.length) {
    warn(
      `${extraInData.length} politician(s) in data but not in roster: ${extraInData.slice(0, 5).join(", ")}${extraInData.length > 5 ? "..." : ""}`
    );
  }
}

if (errors.length === errSnap) {
  console.log(`  ✓ ${roster.length} politicians, 0 duplicates, ≥120 MKs`);
}

// ── Check 3: Hebrew Enforcement ───────────────────────────────────────

console.log("\n🇮🇱 Check 3: Hebrew Enforcement");
errSnap = errors.length;

const HEBREW_RE = /[\u0590-\u05FF]/;
const politicianTranslations = i18n.politicians || {};
const partyTranslations = i18n.parties || {};

// All roster politicians must have Hebrew names
for (const { name } of roster) {
  const he = politicianTranslations[name];
  if (!he) {
    fail(`Missing Hebrew translation for politician: "${name}"`);
  } else if (!HEBREW_RE.test(he)) {
    fail(`Translation for "${name}" contains no Hebrew: "${he}"`);
  }
}

// All roster parties must have Hebrew names
for (const party of rosterParties) {
  const he = partyTranslations[party];
  if (!he) {
    fail(`Missing Hebrew translation for party: "${party}"`);
  } else if (!HEBREW_RE.test(he)) {
    fail(`Translation for party "${party}" contains no Hebrew: "${he}"`);
  }
}

// Check UI-facing i18n keys for non-Hebrew content (excluding PolityMarket, PM, technical keys)
const ENGLISH_EXEMPT = ["PolityMarket", "PM", "AI", "Chain-of-Thought", "RSS", "LLM", "KL", "PSI", "MSE"];

function checkI18nValues(obj, keyPath = "") {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = keyPath ? `${keyPath}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      checkI18nValues(value, fullKey);
    } else if (typeof value === "string" && value.length > 2) {
      // Skip politician/party name maps and technical keys
      if (fullKey.startsWith("politicians.") || fullKey.startsWith("parties.")) continue;
      // Check if the string contains Latin letters that aren't exempt
      const latinOnly = value.replace(/[^a-zA-Z]/g, "");
      if (latinOnly.length > 5 && !HEBREW_RE.test(value)) {
        const isExempt = ENGLISH_EXEMPT.some((e) => value.includes(e));
        if (!isExempt) {
          fail(`i18n key "${fullKey}" has no Hebrew: "${value.slice(0, 60)}"`);
        }
      }
    }
  }
}

checkI18nValues(i18n);

if (errors.length === errSnap) {
  console.log(
    `  ✓ ${Object.keys(politicianTranslations).length} politician names, ${Object.keys(partyTranslations).length} party names — all Hebrew`
  );
}

// ── Check 4: Avatar Coverage ──────────────────────────────────────────

console.log("\n🎨 Check 4: Avatar Coverage");

// Read the trait files to check coverage
const traitDir = path.join(repoRoot, "src/components/politicianTraits/parties");
let traitIds = new Set();

if (fs.existsSync(traitDir)) {
  const traitFiles = fs.readdirSync(traitDir).filter((f) => f.endsWith(".json"));
  for (const file of traitFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(traitDir, file), "utf-8"));
      for (const id of Object.keys(data)) {
        traitIds.add(id);
      }
    } catch (e) {
      warn(`Failed to parse trait file ${file}: ${e.message}`);
    }
  }
} else {
  // Fallback: read the main politicianTraits.js for exported keys
  const traitSrc = fs.readFileSync(
    path.join(repoRoot, "src/components/politicianTraits.js"),
    "utf-8"
  );
  const traitMatches = [...traitSrc.matchAll(/"([a-z][\w-]+)":\s*\{/g)];
  for (const m of traitMatches) traitIds.add(m[1]);
  // Also count null entries (hand-crafted)
  const nullMatches = [...traitSrc.matchAll(/"([a-z][\w-]+)":\s*null/g)];
  for (const m of nullMatches) traitIds.add(m[1]);
}

const missingAvatars = rosterIds.filter((id) => !traitIds.has(id));
if (missingAvatars.length) {
  fail(
    `${missingAvatars.length} politician(s) missing avatar traits: ${missingAvatars.slice(0, 10).join(", ")}${missingAvatars.length > 10 ? "..." : ""}`
  );
} else {
  console.log(`  ✓ ${traitIds.size} avatar traits cover all ${rosterIds.length} roster politicians`);
}

// ── Check 5: Dimension Coverage ───────────────────────────────────────

console.log("\n📐 Check 5: Dimension Coverage");

const detailsDir = path.join(repoRoot, "public/data/details");
if (fs.existsSync(detailsDir)) {
  const detailFiles = fs.readdirSync(detailsDir).filter((f) => f.endsWith(".json")).sort();
  const latestDetailFile = detailFiles.at(-1);
  if (latestDetailFile) {
    try {
      const latestDetail = JSON.parse(
        fs.readFileSync(path.join(detailsDir, latestDetailFile), "utf-8")
      );
      if (Array.isArray(latestDetail) && latestDetail.length > 0) {
        for (const dim of ["dim_public_sentiment", "dim_parliamentary_activity"]) {
          const nonNull = latestDetail.filter(
            (e) => e[dim] != null && Number.isFinite(e[dim])
          ).length;
          const ratio = nonNull / latestDetail.length;
          if (ratio < 0.8) {
            fail(
              `Check 5: ${dim} coverage too low in ${latestDetailFile}: ${nonNull}/${latestDetail.length} (${(ratio * 100).toFixed(0)}%) — expected ≥80%`
            );
          }
        }
        const dimCount = latestDetail.filter((e) => e.dim_public_sentiment != null).length;
        if (dimCount >= Math.floor(latestDetail.length * 0.8)) {
          console.log(
            `  ✓ ${dimCount}/${latestDetail.length} entries have dim_public_sentiment in ${latestDetailFile}`
          );
        }
      }
    } catch (e) {
      warn(`Check 5: Failed to parse latest detail file: ${e.message}`);
    }
  } else {
    warn("Check 5: Skipped — no detail files found");
  }
} else {
  warn("Check 5: Skipped — details directory not found");
}

// ── Check 6: Promises DB Integrity ────────────────────────────────────

console.log("\n🤝 Check 6: Promises DB Integrity");

const promisesDbPath = path.join(repoRoot, "data-pipeline/data/promises-database.json");
try {
  const promisesDb = JSON.parse(fs.readFileSync(promisesDbPath, "utf-8"));

  if (!promisesDb.version) fail("Check 6: promises-database.json missing 'version' field");
  if (!promisesDb.politicians || typeof promisesDb.politicians !== "object") {
    fail("Check 6: promises-database.json missing or invalid 'politicians' object");
  } else {
    const politicianKeys = Object.keys(promisesDb.politicians);
    let totalPromises = 0;
    let malformedEntries = 0;

    for (const [id, data] of Object.entries(promisesDb.politicians)) {
      if (!Array.isArray(data.promises)) {
        fail(`Check 6: politicians.${id}.promises is not an array`);
        continue;
      }
      for (const p of data.promises) {
        totalPromises++;
        if (!p.id || !p.text || !p.date || !p.topic) {
          malformedEntries++;
          if (malformedEntries <= 3) {
            warn(`Check 6: Malformed promise in ${id}: missing required fields (id/text/date/topic)`);
          }
        }
        if (p.date && !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
          warn(`Check 6: Invalid date format for promise ${p.id || "(no id)"} in ${id}: ${p.date}`);
        }
      }
    }

    if (malformedEntries > 3) {
      warn(`Check 6: ${malformedEntries} total malformed promise entries (showing first 3)`);
    }
    console.log(
      `  ✓ promises-database.json: ${politicianKeys.length} politicians, ${totalPromises} promises`
    );
  }
} catch (e) {
  fail(`Check 6: Failed to parse promises-database.json: ${e.message}`);
}

// ── Summary ───────────────────────────────────────────────────────────

console.log("");

if (warnings.length) {
  console.warn(`⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
}

if (errors.length) {
  console.error(`\n✗ FAILED — ${errors.length} error(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
} else {
  console.log("✅ All data integrity checks passed\n");
}
