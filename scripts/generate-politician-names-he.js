#!/usr/bin/env node
/**
 * Extracts the "politicians" section from the Hebrew translation file
 * and writes it to public/data/politician_names_he.json.
 *
 * This keeps the Cloud Function's Hebrew name lookup in sync with i18n.
 * Run automatically via Vite plugin on build, or manually:
 *   node scripts/generate-politician-names-he.js
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);

export function generatePoliticianNames(rootDir = resolve(__dirname, "..")) {
  const translation = JSON.parse(
    readFileSync(resolve(rootDir, "src/locales/he/translation.json"), "utf-8")
  );
  const names = translation.politicians || {};

  const outPath = resolve(rootDir, "public/data/politician_names_he.json");
  writeFileSync(outPath, JSON.stringify(names, null, 2) + "\n", "utf-8");

  return Object.keys(names).length;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === scriptPath;
if (isDirectRun) {
  const count = generatePoliticianNames();
  console.log(`✓ Wrote ${count} politician names to public/data/politician_names_he.json`);
}
