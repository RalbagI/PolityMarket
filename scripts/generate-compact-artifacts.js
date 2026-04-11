#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const dataDir = path.join(repoRoot, "public", "data");
const summaryPath = path.join(dataDir, "timeseries_summary.json");
const compactSummaryPath = path.join(dataDir, "timeseries_summary.compact.json");
const detailsDir = path.join(dataDir, "details");
const detailsLiteDir = path.join(dataDir, "details-lite");
const bottomLinesPath = path.join(dataDir, "bottom_lines.json");

function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return Array.isArray(raw) ? raw : [];
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function buildCompactSummaryEntry(entry) {
  return {
    date: entry.date,
    politician_id: entry.politician_id,
    name: entry.name,
    party: entry.party,
    wing: entry.wing ?? null,
    sector: entry.sector ?? null,
    role: entry.role ?? null,
    overall_score: entry.overall_score,
    dim_public_sentiment: entry.dim_public_sentiment ?? null,
    dim_parliamentary_activity: entry.dim_parliamentary_activity ?? null,
    dim_media_credibility: entry.dim_media_credibility ?? null,
    dim_transparency_ethics: entry.dim_transparency_ethics ?? null,
    dim_field_activity: entry.dim_field_activity ?? null,
    dim_satire_cultural_impact: entry.dim_satire_cultural_impact ?? null,
    dim_legislative_quality: entry.dim_legislative_quality ?? null,
    dim_flipflop_index: entry.dim_flipflop_index ?? null,
    media_climate_raw: entry.media_climate_raw ?? entry.overall_score_raw ?? entry.overall_score,
    media_climate_display: entry.media_climate_display ?? entry.market_score ?? null,
    media_volume: entry.media_volume,
    market_score: entry.market_score ?? null,
    market_percentile: entry.market_percentile ?? null,
    market_tier: entry.market_tier ?? null,
    market_delta_points: entry.market_delta_points ?? null,
    market_delta_pct: entry.market_delta_pct ?? null,
    has_direct_coverage: entry.has_direct_coverage ?? null,
    signal_strength: entry.signal_strength ?? null,
    source_diversity: entry.source_diversity ?? null,
    coverage_confidence: entry.coverage_confidence ?? null,
    consensus_proxy: entry.consensus_proxy ?? null,
    consensus_ci_low: entry.consensus_ci_low ?? null,
    consensus_ci_high: entry.consensus_ci_high ?? null,
    consensus_signal_source: entry.consensus_signal_source ?? null,
    consensus_confidence: entry.consensus_confidence ?? null,
  };
}

function buildDetailLiteEntry(entry) {
  return {
    politician_id: entry.politician_id,
    name: entry.name,
    party: entry.party,
    wing: entry.wing,
    sector: entry.sector,
    role: entry.role,
    hostility_level: entry.hostility_level,
    policy_approval: entry.policy_approval,
    media_amplification: entry.media_amplification,
    media_volume: entry.media_volume,
    overall_score: entry.overall_score,
    media_climate_raw: entry.media_climate_raw ?? entry.overall_score_raw ?? entry.overall_score,
    media_climate_display: entry.media_climate_display ?? entry.market_score ?? null,
    chain_of_thought: entry.chain_of_thought,
    chain_of_thought_en: entry.chain_of_thought_en ?? null,
    dim_public_sentiment: entry.dim_public_sentiment ?? null,
    dim_parliamentary_activity: entry.dim_parliamentary_activity ?? null,
    dim_media_credibility: entry.dim_media_credibility ?? null,
    dim_transparency_ethics: entry.dim_transparency_ethics ?? null,
    dim_field_activity: entry.dim_field_activity ?? null,
    dim_satire_cultural_impact: entry.dim_satire_cultural_impact ?? null,
    dim_legislative_quality: entry.dim_legislative_quality ?? null,
    dim_flipflop_index: entry.dim_flipflop_index ?? null,
    market_score: entry.market_score ?? null,
    market_percentile: entry.market_percentile ?? null,
    market_tier: entry.market_tier ?? null,
    market_delta_points: entry.market_delta_points ?? null,
    market_delta_pct: entry.market_delta_pct ?? null,
    has_direct_coverage: entry.has_direct_coverage ?? null,
    signal_strength: entry.signal_strength ?? null,
    source_diversity: entry.source_diversity ?? null,
    coverage_confidence: entry.coverage_confidence ?? null,
    consensus_proxy: entry.consensus_proxy ?? null,
    consensus_ci_low: entry.consensus_ci_low ?? null,
    consensus_ci_high: entry.consensus_ci_high ?? null,
    consensus_signal_source: entry.consensus_signal_source ?? null,
    consensus_confidence: entry.consensus_confidence ?? null,
    news_headlines: Array.isArray(entry.news_headlines) ? entry.news_headlines : [],
    social_mentions: Array.isArray(entry.social_mentions) ? entry.social_mentions : [],
  };
}

function extractBottomLine(chainOfThought) {
  if (!chainOfThought || typeof chainOfThought !== "string") return null;
  const match = chainOfThought.match(
    /^##\s*(?:שורה תחתונה|Bottom Line)\s*\n([\s\S]*?)(?=\n##\s|\s*$)/m
  );
  if (!match) return null;
  const body = match[1].trim();
  if (!body) return null;
  // Collapse to the first sentence / first line for a punchy hero.
  const firstLine = body
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine || null;
}

function generateBottomLines() {
  if (!fs.existsSync(detailsLiteDir)) {
    console.warn("[compact-artifacts] details-lite directory missing; skipping bottom-lines");
    return;
  }
  const dateFiles = fs
    .readdirSync(detailsLiteDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort();
  if (!dateFiles.length) return;

  const latestFile = dateFiles[dateFiles.length - 1];
  const latestDate = latestFile.replace(/\.json$/, "");
  const entries = readJsonArray(path.join(detailsLiteDir, latestFile));

  const bottomLines = entries
    .map((entry) => {
      const he = extractBottomLine(entry.chain_of_thought);
      const en = extractBottomLine(entry.chain_of_thought_en);
      if (!he && !en) return null;
      return {
        politician_id: entry.politician_id,
        name: entry.name,
        party: entry.party,
        bottom_line_he: he,
        bottom_line_en: en,
      };
    })
    .filter(Boolean);

  writeJson(bottomLinesPath, {
    date: latestDate,
    generated_at: new Date().toISOString(),
    count: bottomLines.length,
    bottom_lines: bottomLines,
  });
}

function generateCompactSummary() {
  const summary = readJsonArray(summaryPath);
  if (!summary.length) {
    console.warn(
      "[compact-artifacts] timeseries_summary.json missing or empty; skipping summary compaction"
    );
    return;
  }
  writeJson(compactSummaryPath, summary.map(buildCompactSummaryEntry));
}

function generateLiteDetails() {
  if (!fs.existsSync(detailsDir)) {
    console.warn("[compact-artifacts] details directory missing; skipping detail compaction");
    return;
  }

  fs.rmSync(detailsLiteDir, { recursive: true, force: true });
  fs.mkdirSync(detailsLiteDir, { recursive: true });

  const detailFiles = fs
    .readdirSync(detailsDir)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort();

  for (const file of detailFiles) {
    const date = file.replace(/\.json$/, "");
    const fullEntries = readJsonArray(path.join(detailsDir, file));
    const liteEntries = fullEntries.map(buildDetailLiteEntry);
    writeJson(path.join(detailsLiteDir, `${date}.json`), liteEntries);

    const perDateDir = path.join(detailsLiteDir, date);
    fs.mkdirSync(perDateDir, { recursive: true });
    for (const entry of liteEntries) {
      if (!entry.politician_id) continue;
      writeJson(path.join(perDateDir, `${entry.politician_id}.json`), entry);
    }
  }
}

generateCompactSummary();
generateLiteDetails();
generateBottomLines();
console.log(
  "[compact-artifacts] generated compact summary, lite detail, and bottom-lines artifacts"
);
