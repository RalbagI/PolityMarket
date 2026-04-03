#!/usr/bin/env node
/* global process */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aggregateParties } from "../data-pipeline/lib/validation.js";
import { annotateMarketTimeline } from "../src/lib/marketScore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const dataRoot = path.join(repoRoot, "public", "data");
const detailsDir = path.join(dataRoot, "details");
const summaryPath = path.join(dataRoot, "timeseries_summary.json");
const partySummaryPath = path.join(dataRoot, "party_summary.json");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function fail(message) {
  console.error(`Backfill failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function getDetailDates() {
  if (!fs.existsSync(detailsDir)) fail(`Missing details directory: ${detailsDir}`);
  return fs
    .readdirSync(detailsDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .map((file) => file.replace(".json", ""))
    .sort();
}

function getSummaryRowsByDate(summary, date) {
  return summary.filter((row) => row.date === date);
}

function getUniqueIdCount(rows) {
  return new Set(rows.map((row) => row.politician_id)).size;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function compareByPoliticianId(a, b) {
  return a.politician_id.localeCompare(b.politician_id);
}

function compareByDateThenPoliticianId(a, b) {
  return a.date.localeCompare(b.date) || a.politician_id.localeCompare(b.politician_id);
}

function compareByDateThenParty(a, b) {
  return a.date.localeCompare(b.date) || a.party.localeCompare(b.party);
}

const args = parseArgs(process.argv.slice(2));
const expected = Number.parseInt(
  args.expected || process.env.PIPELINE_EXPECTED_POLITICIAN_COUNT || "135",
  10
);
if (!Number.isFinite(expected) || expected <= 0) {
  fail(`Invalid expected count: ${expected}`);
}

const allDates = getDetailDates();
if (allDates.length === 0) fail("No detail files found");

const summary = readJson(summaryPath);
if (!Array.isArray(summary)) fail("timeseries_summary.json must be an array");

let templateDate = args["template-date"];
if (!templateDate) {
  templateDate = [...allDates].reverse().find((date) => {
    const detailRows = readJson(path.join(detailsDir, `${date}.json`));
    const summaryRows = getSummaryRowsByDate(summary, date);
    return (
      Array.isArray(detailRows) &&
      detailRows.length === expected &&
      getUniqueIdCount(detailRows) === expected &&
      summaryRows.length === expected &&
      getUniqueIdCount(summaryRows) === expected
    );
  });
}
if (!templateDate) {
  fail(`Could not find a template date with ${expected} detail and summary rows`);
}

const templateDetailPath = path.join(detailsDir, `${templateDate}.json`);
if (!fs.existsSync(templateDetailPath))
  fail(`Template detail file not found: ${templateDetailPath}`);

const templateDetails = readJson(templateDetailPath);
const templateSummaryRows = getSummaryRowsByDate(summary, templateDate);

if (!Array.isArray(templateDetails)) fail(`Template detail file is not an array: ${templateDate}`);
if (templateDetails.length !== expected) {
  fail(
    `Template detail count mismatch for ${templateDate}: expected ${expected}, got ${templateDetails.length}`
  );
}
if (getUniqueIdCount(templateDetails) !== expected) {
  fail(`Template detail unique ID mismatch for ${templateDate}`);
}
if (templateSummaryRows.length !== expected) {
  fail(
    `Template summary count mismatch for ${templateDate}: expected ${expected}, got ${templateSummaryRows.length}`
  );
}
if (getUniqueIdCount(templateSummaryRows) !== expected) {
  fail(`Template summary unique ID mismatch for ${templateDate}`);
}

const templateDetailMap = new Map(templateDetails.map((row) => [row.politician_id, row]));
const templateSummaryMap = new Map(templateSummaryRows.map((row) => [row.politician_id, row]));
const rosterIds = templateDetails.map((row) => row.politician_id).sort();

const targetDates = allDates.filter((date) => date !== templateDate);
let mutatedDates = 0;

for (const date of targetDates) {
  const detailPath = path.join(detailsDir, `${date}.json`);
  const detailRows = readJson(detailPath);
  if (!Array.isArray(detailRows)) fail(`Detail file is not an array: ${detailPath}`);

  const detailById = new Map(detailRows.map((row) => [row.politician_id, row]));
  const existingSummaryRows = getSummaryRowsByDate(summary, date);
  const summaryById = new Map(existingSummaryRows.map((row) => [row.politician_id, row]));

  const normalizedDetailRows = rosterIds.map((id) => {
    const current = detailById.get(id);
    if (current) return clone(current);
    const fallback = templateDetailMap.get(id);
    if (!fallback) fail(`Template detail row missing for politician_id=${id}`);
    return clone(fallback);
  });
  const normalizedDetailById = new Map(normalizedDetailRows.map((row) => [row.politician_id, row]));

  const normalizedSummaryRows = rosterIds.map((id) => {
    const current = summaryById.get(id);
    const detailFallback = normalizedDetailById.get(id);
    const templateSummary = templateSummaryMap.get(id);
    if (current) {
      return {
        ...clone(current),
        date,
      };
    }
    if (!templateSummary && !detailFallback) {
      fail(`No summary fallback for politician_id=${id} on ${date}`);
    }
    return {
      date,
      politician_id: id,
      name: templateSummary?.name ?? detailFallback?.name,
      party: templateSummary?.party ?? detailFallback?.party,
      wing: templateSummary?.wing ?? "unknown",
      sector: templateSummary?.sector ?? "unknown",
      role: templateSummary?.role ?? detailFallback?.role ?? "mk",
      overall_score: templateSummary?.overall_score ?? detailFallback?.overall_score ?? 5,
      media_volume: templateSummary?.media_volume ?? detailFallback?.media_volume ?? 5,
    };
  });

  normalizedDetailRows.sort(compareByPoliticianId);
  normalizedSummaryRows.sort(compareByPoliticianId);

  const detailChanged =
    detailRows.length !== normalizedDetailRows.length ||
    JSON.stringify(detailRows) !== JSON.stringify(normalizedDetailRows);
  const summaryChanged =
    existingSummaryRows.length !== normalizedSummaryRows.length ||
    JSON.stringify(existingSummaryRows) !== JSON.stringify(normalizedSummaryRows);

  if (detailChanged) {
    writeJson(detailPath, normalizedDetailRows);
  }
  if (summaryChanged) {
    const filtered = summary.filter((row) => row.date !== date);
    summary.length = 0;
    summary.push(...filtered, ...normalizedSummaryRows);
  }
  if (detailChanged || summaryChanged) {
    mutatedDates += 1;
    console.log(
      `Backfilled ${date}: detail=${detailRows.length}->${normalizedDetailRows.length}, summary=${existingSummaryRows.length}->${normalizedSummaryRows.length}`
    );
  }
}

const annotatedSummary = annotateMarketTimeline(summary, { entityKey: "politician_id" }).sort(
  compareByDateThenPoliticianId
);
writeJson(summaryPath, annotatedSummary);

const summaryMarketLookup = new Map(
  annotatedSummary.map((row) => [`${row.date}::${row.politician_id}`, row])
);
const rebuiltPartySummary = [];

for (const date of allDates) {
  const detailPath = path.join(detailsDir, `${date}.json`);
  const detailRows = readJson(detailPath);
  if (!Array.isArray(detailRows)) fail(`Detail file is not an array: ${detailPath}`);

  const detailWithMarket = detailRows.map((row) => {
    const marketRow = summaryMarketLookup.get(`${date}::${row.politician_id}`);
    if (!marketRow) return row;
    return {
      ...row,
      market_score: marketRow.market_score ?? null,
      market_percentile: marketRow.market_percentile ?? null,
      market_tier: marketRow.market_tier ?? null,
      market_delta_points: marketRow.market_delta_points ?? null,
      market_delta_pct: marketRow.market_delta_pct ?? null,
    };
  });

  if (JSON.stringify(detailRows) !== JSON.stringify(detailWithMarket)) {
    writeJson(detailPath, detailWithMarket);
  }

  rebuiltPartySummary.push(...aggregateParties(detailWithMarket, date));
}

const annotatedPartySummary = annotateMarketTimeline(rebuiltPartySummary, {
  entityKey: "party",
}).sort(compareByDateThenParty);
writeJson(partySummaryPath, annotatedPartySummary);

console.log(
  `Backfill complete. Template=${templateDate}, expected=${expected}, mutated_dates=${mutatedDates}, party_rows=${annotatedPartySummary.length}`
);
