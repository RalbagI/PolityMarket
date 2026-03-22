#!/usr/bin/env node

/**
 * CI validation: ensures all politician names and party names in the
 * data have corresponding Hebrew translations. Prevents English from
 * leaking into the Hebrew-only UI.
 *
 * Usage: node scripts/validate-i18n-coverage.js
 * Exit code 1 if any translation is missing.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const summaryPath = path.join(repoRoot, "public/data/timeseries_summary.json");
const i18nPath = path.join(repoRoot, "src/locales/he/translation.json");

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
const i18n = JSON.parse(fs.readFileSync(i18nPath, "utf-8"));

const politicianTranslations = i18n.politicians || {};
const partyTranslations = i18n.parties || {};

const HEBREW_RE = /[\u0590-\u05FF]/;

const errors = [];

// Check politician names
const uniqueNames = [...new Set(summary.map((r) => r.name))];
for (const name of uniqueNames) {
  const he = politicianTranslations[name];
  if (!he) {
    errors.push(`Missing Hebrew translation for politician: "${name}"`);
  } else if (!HEBREW_RE.test(he)) {
    errors.push(`Translation for "${name}" contains no Hebrew characters: "${he}"`);
  }
}

// Check party names
const uniqueParties = [...new Set(summary.map((r) => r.party))];
for (const party of uniqueParties) {
  const he = partyTranslations[party];
  if (!he) {
    errors.push(`Missing Hebrew translation for party: "${party}"`);
  } else if (!HEBREW_RE.test(he)) {
    errors.push(`Translation for party "${party}" contains no Hebrew characters: "${he}"`);
  }
}

if (errors.length) {
  console.error(`i18n coverage validation FAILED (${errors.length} issues):\n`);
  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }
  process.exit(1);
} else {
  console.log(
    `i18n coverage OK: ${uniqueNames.length} politicians, ${uniqueParties.length} parties — all have Hebrew translations`
  );
}
