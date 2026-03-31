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
const root = resolve(__dirname, "..");

const translation = JSON.parse(
  readFileSync(resolve(root, "src/locales/he/translation.json"), "utf-8"),
);
const names = translation.politicians || {};

const outPath = resolve(root, "public/data/politician_names_he.json");
writeFileSync(outPath, JSON.stringify(names, null, 2) + "\n", "utf-8");

const count = Object.keys(names).length;
console.log(`✓ Wrote ${count} politician names to public/data/politician_names_he.json`);
