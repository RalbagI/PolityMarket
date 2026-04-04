#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    args[key] = value;
  }
  return args;
}

function getDateInTimezone(tz) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parts.find((part) => part.type === type)?.value;
  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function fail(message) {
  console.error(`Validation failed: ${message}`);
  process.exit(1);
}

const REQUIRED_MARKET_FIELDS = [
  "market_score",
  "market_percentile",
  "market_tier",
  "market_delta_points",
  "market_delta_pct",
];

function ensureRequiredMarketFields(rows, label) {
  for (const row of rows) {
    for (const field of REQUIRED_MARKET_FIELDS) {
      if (!(field in row)) {
        fail(`${label} row for ${row.politician_id || row.party || "unknown"} is missing ${field}`);
      }
      if (typeof row[field] === "undefined") {
        fail(
          `${label} row for ${row.politician_id || row.party || "unknown"} has undefined ${field}`
        );
      }
    }
  }
}

const args = parseArgs(process.argv.slice(2));
const timezone = process.env.TZ || "Asia/Jerusalem";
const date = args.date || getDateInTimezone(timezone);
const expected = Number.parseInt(
  args.expected || process.env.PIPELINE_EXPECTED_POLITICIAN_COUNT || "135",
  10
);

if (!Number.isFinite(expected) || expected <= 0) {
  fail(`Invalid expected count: ${expected}`);
}

const summaryPath = path.join(repoRoot, "public/data/timeseries_summary.json");
const detailPath = path.join(repoRoot, `public/data/details/${date}.json`);
const partySummaryPath = path.join(repoRoot, "public/data/party_summary.json");

if (!fs.existsSync(summaryPath)) fail(`Missing summary file: ${summaryPath}`);
if (!fs.existsSync(detailPath)) fail(`Missing detail file for ${date}: ${detailPath}`);
if (!fs.existsSync(partySummaryPath)) fail(`Missing party summary file: ${partySummaryPath}`);

const summary = readJsonFile(summaryPath);
const detail = readJsonFile(detailPath);
const partySummary = readJsonFile(partySummaryPath);

if (!Array.isArray(summary)) fail("timeseries_summary.json is not an array");
if (!Array.isArray(detail)) fail(`${date}.json detail file is not an array`);
if (!Array.isArray(partySummary)) fail("party_summary.json is not an array");

if (detail.length !== expected) {
  fail(`Detail entry count mismatch for ${date}: expected ${expected}, got ${detail.length}`);
}

const summaryForDate = summary.filter((row) => row.date === date);
if (summaryForDate.length !== expected) {
  fail(
    `Summary row count mismatch for ${date}: expected ${expected}, got ${summaryForDate.length}`
  );
}

const detailIds = new Set(detail.map((row) => row.politician_id));
const summaryIds = new Set(summaryForDate.map((row) => row.politician_id));

if (detailIds.size !== expected) {
  fail(`Detail unique politician count mismatch: expected ${expected}, got ${detailIds.size}`);
}

if (summaryIds.size !== expected) {
  fail(`Summary unique politician count mismatch: expected ${expected}, got ${summaryIds.size}`);
}

for (const id of detailIds) {
  if (!summaryIds.has(id)) {
    fail(`Politician ${id} exists in detail but not in summary`);
  }
}

const partySummaryForDate = partySummary.filter((row) => row.date === date);
if (partySummaryForDate.length === 0) {
  fail(`No party summary rows found for ${date}`);
}

ensureRequiredMarketFields(summaryForDate, "summary");
ensureRequiredMarketFields(detail, "detail");
ensureRequiredMarketFields(partySummaryForDate, "party summary");

console.log(
  `Validation passed for ${date}: ${expected} summary rows, ${expected} detail rows, and ${partySummaryForDate.length} party rows in ${timezone}`
);
