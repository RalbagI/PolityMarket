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

const args = parseArgs(process.argv.slice(2));
const timezone = process.env.TZ || "Asia/Jerusalem";
const date = args.date || getDateInTimezone(timezone);
const expected = Number.parseInt(
  args.expected || process.env.PIPELINE_EXPECTED_POLITICIAN_COUNT || "120",
  10
);

if (!Number.isFinite(expected) || expected <= 0) {
  fail(`Invalid expected count: ${expected}`);
}

const summaryPath = path.join(repoRoot, "public/data/timeseries_summary.json");
const detailPath = path.join(repoRoot, `public/data/details/${date}.json`);

if (!fs.existsSync(summaryPath)) fail(`Missing summary file: ${summaryPath}`);
if (!fs.existsSync(detailPath)) fail(`Missing detail file for ${date}: ${detailPath}`);

const summary = readJsonFile(summaryPath);
const detail = readJsonFile(detailPath);

if (!Array.isArray(summary)) fail("timeseries_summary.json is not an array");
if (!Array.isArray(detail)) fail(`${date}.json detail file is not an array`);

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

console.log(
  `Validation passed for ${date}: ${expected} summary rows and ${expected} detail rows in ${timezone}`
);
