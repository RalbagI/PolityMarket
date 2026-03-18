import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import parseLLMResponse from "./lib/parseLLMResponse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────
const GOLDEN_DATASET_PATH = path.join(__dirname, "golden_dataset.json");
const DRIFT_LOG_PATH = path.join(__dirname, "../public/data/drift_log.json");
const DRIFT_ALERTS_PATH = path.join(__dirname, "drift_alerts.json");

const MSE_THRESHOLD = 0.15;
const PSI_THRESHOLD = 0.2;
const KL_SPIKE_THRESHOLD = 0.5;
const BASELINE_WINDOW_DAYS = 30;
const NUM_BINS = 10;
const MIN_SAMPLE_SIZE_FOR_DRIFT = 10;

// Webhook URL for drift alerts (Slack, Discord, Telegram, etc.)
// Set via: DRIFT_WEBHOOK_URL environment variable
const DRIFT_WEBHOOK_URL = process.env.DRIFT_WEBHOOK_URL || "";

// ── Load System Prompt (lazy, non-fatal) ───────────────────────────────
let SYSTEM_PROMPT = "";
try {
  SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, "prompts", "system-prompt.txt"), "utf-8");
} catch {
  console.warn("[Warning] prompts/system-prompt.txt not found — LLM scoring unavailable");
}

async function scoreSingleText(text, speakerContext, threadContext) {
  let userPrompt = `Evaluate this single political statement:\n\n"${text}"`;
  if (speakerContext) {
    userPrompt += `\n\nSpeaker context: ${speakerContext}`;
  }
  if (threadContext?.length) {
    userPrompt += `\n\nThread context:\n${threadContext.map((t) => `- "${t}"`).join("\n")}`;
  }
  userPrompt +=
    "\n\nRemember: chain_of_thought FIRST, then three dimensional scores. No overall_score.";

  // ── Production: uncomment one of these ──
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic();
  // const message = await client.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 500,
  //   temperature: 0.0,
  //   system: SYSTEM_PROMPT,
  //   messages: [{ role: 'user', content: userPrompt }],
  // });
  // return parseLLMResponse(message.content[0].text);

  // ── Mock: return slightly noisy scores for testing ──
  return null;
}

// ── Statistical Functions ──────────────────────────────────────────────

function computeMSE(goldenEntries, llmResults) {
  let totalSE = 0;
  let count = 0;
  const deviations = [];

  for (let i = 0; i < goldenEntries.length; i++) {
    const g = goldenEntries[i];
    const l = llmResults[i];
    if (!l) continue;

    const seHostility = (l.hostility_level - g.expected_hostility) ** 2;
    const sePolicy = (l.policy_approval - g.expected_policy_approval) ** 2;
    const seAmplification = (l.media_amplification - g.expected_media_amplification) ** 2;
    const entryMSE = (seHostility + sePolicy + seAmplification) / 3;

    totalSE += entryMSE;
    count++;

    if (entryMSE > MSE_THRESHOLD) {
      deviations.push({
        id: g.id,
        category: g.category,
        text: g.text.substring(0, 80) + "...",
        mse: parseFloat(entryMSE.toFixed(4)),
        expected: {
          hostility: g.expected_hostility,
          policy: g.expected_policy_approval,
          amplification: g.expected_media_amplification,
        },
        actual: {
          hostility: l.hostility_level,
          policy: l.policy_approval,
          amplification: l.media_amplification,
        },
      });
    }
  }

  return {
    mse: count > 0 ? parseFloat((totalSE / count).toFixed(6)) : null,
    deviations,
    evaluated: count,
  };
}

/**
 * KL Divergence: D_KL(P || Q) = Σ P(x) * log(P(x) / Q(x))
 * P = baseline distribution, Q = current distribution.
 * Both arrays must be probability distributions (sum to 1).
 * Uses Laplace smoothing to avoid log(0).
 */
function klDivergence(p, q) {
  const epsilon = 1e-10;
  let divergence = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], epsilon);
    const qi = Math.max(q[i], epsilon);
    divergence += pi * Math.log(pi / qi);
  }
  return parseFloat(divergence.toFixed(6));
}

/**
 * Population Stability Index (PSI)
 * PSI = Σ (Q_i - P_i) * ln(Q_i / P_i)
 * PSI < 0.1: no significant shift
 * 0.1 ≤ PSI < 0.2: moderate shift
 * PSI ≥ 0.2: significant drift
 */
function populationStabilityIndex(p, q) {
  const epsilon = 1e-10;
  let psi = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = Math.max(p[i], epsilon);
    const qi = Math.max(q[i], epsilon);
    psi += (qi - pi) * Math.log(qi / pi);
  }
  return parseFloat(psi.toFixed(6));
}

/**
 * Bin scores into a histogram distribution.
 * Scores in [min, max] are divided into numBins equal-width bins.
 * Returns a probability distribution (sums to 1).
 */
function binScores(scores, min, max, numBins) {
  const bins = new Array(numBins).fill(0);
  const binWidth = (max - min) / numBins;

  for (const score of scores) {
    let binIdx = Math.floor((score - min) / binWidth);
    if (binIdx >= numBins) binIdx = numBins - 1;
    if (binIdx < 0) binIdx = 0;
    bins[binIdx]++;
  }

  const total = scores.length || 1;
  return bins.map((b) => b / total);
}

/**
 * Compute KL divergence and PSI for a specific dimension,
 * comparing baseline scores against current batch scores.
 */
function computeDriftMetrics(baselineScores, currentScores, min, max) {
  const pDist = binScores(baselineScores, min, max, NUM_BINS);
  const qDist = binScores(currentScores, min, max, NUM_BINS);

  return {
    kl_divergence: klDivergence(pDist, qDist),
    psi: populationStabilityIndex(pDist, qDist),
    baseline_count: baselineScores.length,
    current_count: currentScores.length,
  };
}

// ── Drift Log Management ───────────────────────────────────────────────

function loadDriftLog() {
  try {
    return JSON.parse(fs.readFileSync(DRIFT_LOG_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function appendDriftLog(entry) {
  const log = loadDriftLog();
  log.push(entry);
  // Keep last 365 days of drift data
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const trimmed = log.filter((e) => e.date >= cutoffStr);
  fs.writeFileSync(DRIFT_LOG_PATH, JSON.stringify(trimmed, null, 2));
}

function writeAlert(alert) {
  let alerts = [];
  try {
    alerts = JSON.parse(fs.readFileSync(DRIFT_ALERTS_PATH, "utf-8"));
  } catch {
    // Starting fresh
  }
  alerts.push(alert);
  fs.writeFileSync(DRIFT_ALERTS_PATH, JSON.stringify(alerts, null, 2));
}

// ── Webhook Notification ───────────────────────────────────────────────

async function sendWebhookAlert(alert) {
  if (!DRIFT_WEBHOOK_URL) return;

  const payload = {
    text:
      `🚨 *PolityMarket Drift Alert*\n` +
      `Type: ${alert.type}\n` +
      `Date: ${alert.date}\n` +
      `${alert.message}\n` +
      (alert.mse != null ? `MSE: ${alert.mse} (threshold: ${alert.threshold})` : "") +
      (alert.psi != null ? `PSI: ${alert.psi} (threshold: ${alert.threshold})` : "") +
      (alert.deviations != null ? `\nDeviating entries: ${alert.deviations}` : ""),
  };

  try {
    const res = await fetch(DRIFT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`  ⚠ Webhook failed: HTTP ${res.status}`);
    } else {
      console.log("  ✓ Webhook alert sent");
    }
  } catch (err) {
    console.error(`  ⚠ Webhook error: ${err.message}`);
  }
}

// ── Main Validation ────────────────────────────────────────────────────

async function runGoldenDatasetValidation() {
  console.log("\n🔬 Golden Dataset Validation\n");

  const golden = JSON.parse(fs.readFileSync(GOLDEN_DATASET_PATH, "utf-8"));
  console.log(`Loaded ${golden.length} golden benchmark entries.`);

  // Score each entry with the LLM
  const llmResults = [];
  let mockMode = false;

  for (const entry of golden) {
    const result = await scoreSingleText(entry.text, entry.speaker_context, entry.thread_context);

    if (result === null) {
      // Mock mode — generate slightly noisy versions of expected scores
      if (!mockMode) {
        console.log("[Mock mode] No LLM API configured — using noisy expected scores");
        mockMode = true;
      }
      llmResults.push({
        hostility_level: Math.max(
          0,
          Math.min(1, entry.expected_hostility + (Math.random() - 0.5) * 0.1)
        ),
        policy_approval: Math.max(
          -1,
          Math.min(1, entry.expected_policy_approval + (Math.random() - 0.5) * 0.1)
        ),
        media_amplification: Math.max(
          0,
          Math.min(1, entry.expected_media_amplification + (Math.random() - 0.5) * 0.1)
        ),
      });
    } else {
      llmResults.push(result);
    }
  }

  // Compute MSE
  const { mse, deviations, evaluated } = computeMSE(golden, llmResults);
  console.log(`\nEvaluated: ${evaluated} / ${golden.length} entries`);
  console.log(`Mean Squared Error: ${mse}`);
  console.log(`MSE Threshold: ${MSE_THRESHOLD}`);
  console.log(`Status: ${mse <= MSE_THRESHOLD ? "✅ PASS" : "❌ FAIL — DRIFT DETECTED"}`);

  if (deviations.length > 0) {
    console.log(`\n⚠ ${deviations.length} entries exceeded per-entry MSE threshold:`);
    for (const d of deviations.slice(0, 5)) {
      console.log(`  [${d.id}] ${d.category}: MSE=${d.mse} — "${d.text}"`);
    }
    if (deviations.length > 5) {
      console.log(`  ... and ${deviations.length - 5} more`);
    }
  }

  return { mse, deviations, evaluated, drifted: mse > MSE_THRESHOLD };
}

function runDistributionDrift(summaryPath) {
  console.log("\n📊 Distribution Drift Analysis\n");

  let summary;
  try {
    summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
  } catch {
    console.log("No summary data available — skipping distribution drift.");
    return null;
  }

  const allDates = [...new Set(summary.map((e) => e.date))].sort();
  if (allDates.length < 2) {
    console.log("Not enough historical data for drift analysis (need >= 2 days).");
    return null;
  }

  const latestDate = allDates[allDates.length - 1];
  const cutoffDate = new Date(latestDate);
  cutoffDate.setDate(cutoffDate.getDate() - BASELINE_WINDOW_DAYS);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const baseline = summary.filter((e) => e.date >= cutoffStr && e.date < latestDate);
  const current = summary.filter((e) => e.date === latestDate);

  if (baseline.length === 0 || current.length === 0) {
    console.log("Insufficient data for baseline/current comparison.");
    return null;
  }

  console.log(`Baseline: ${baseline.length} entries (${cutoffStr} to ${latestDate})`);
  console.log(`Current: ${current.length} entries (${latestDate})`);

  if (current.length < MIN_SAMPLE_SIZE_FOR_DRIFT) {
    console.log(
      `\n⚠ Current batch (${current.length}) below minimum sample size (${MIN_SAMPLE_SIZE_FOR_DRIFT}) — KL/PSI would be unreliable. Skipping distribution drift.`
    );
    return {
      date: latestDate,
      baseline_window: `${cutoffStr} to ${latestDate}`,
      overall_score: { kl_divergence: null, psi: null, skipped: "insufficient_samples" },
    };
  }

  // Compute drift on overall_score (0-10 scale)
  const baselineScores = baseline.map((e) => e.overall_score);
  const currentScores = current.map((e) => e.overall_score);

  const metrics = computeDriftMetrics(baselineScores, currentScores, 0, 10);

  console.log(`\nOverall Score Distribution Drift:`);
  console.log(`  KL Divergence: ${metrics.kl_divergence}`);
  console.log(`  PSI: ${metrics.psi}`);
  console.log(
    `  KL Status: ${metrics.kl_divergence <= KL_SPIKE_THRESHOLD ? "✅ Normal" : "⚠ Spike detected"}`
  );
  console.log(
    `  PSI Status: ${metrics.psi < 0.1 ? "✅ No shift" : metrics.psi < PSI_THRESHOLD ? "⚡ Moderate shift" : "❌ Significant drift"}`
  );

  return {
    date: latestDate,
    baseline_window: `${cutoffStr} to ${latestDate}`,
    overall_score: metrics,
  };
}

// ── CLI Entry Point ────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🛡️ PolityMarket Drift Detection — ${today}\n`);

  // 1. Golden dataset validation
  const goldenResult = await runGoldenDatasetValidation();

  // 2. Distribution drift (KL + PSI)
  const summaryPath = path.join(__dirname, "../public/data/timeseries_summary.json");
  const driftResult = runDistributionDrift(summaryPath);

  // 3. Log results
  const logEntry = {
    date: today,
    golden_dataset: {
      mse: goldenResult.mse,
      evaluated: goldenResult.evaluated,
      deviations_count: goldenResult.deviations.length,
      drifted: goldenResult.drifted,
    },
    distribution_drift: driftResult
      ? {
          kl_divergence: driftResult.overall_score.kl_divergence,
          psi: driftResult.overall_score.psi,
        }
      : null,
  };

  appendDriftLog(logEntry);
  console.log(`\n📝 Drift metrics logged to ${DRIFT_LOG_PATH}`);

  // 4. Alert if drifted (file + webhook)
  if (goldenResult.drifted) {
    const alert = {
      date: today,
      type: "golden_dataset_mse",
      mse: goldenResult.mse,
      threshold: MSE_THRESHOLD,
      deviations: goldenResult.deviations.length,
      message: `Golden dataset MSE (${goldenResult.mse}) exceeds threshold (${MSE_THRESHOLD}). LLM scoring may have drifted.`,
    };
    writeAlert(alert);
    await sendWebhookAlert(alert);
    console.log(`\n🚨 ALERT written to ${DRIFT_ALERTS_PATH}`);
    console.log(`   ${alert.message}`);
  }

  if (driftResult?.overall_score.psi >= PSI_THRESHOLD) {
    const alert = {
      date: today,
      type: "psi_significant_drift",
      psi: driftResult.overall_score.psi,
      threshold: PSI_THRESHOLD,
      message: `PSI (${driftResult.overall_score.psi}) indicates significant distribution drift.`,
    };
    writeAlert(alert);
    await sendWebhookAlert(alert);
    console.log(`\n🚨 ALERT: ${alert.message}`);
  }

  console.log(`\n✅ Drift detection complete for ${today}`);

  // Exit with error code if drift detected (useful for CI)
  if (goldenResult.drifted) {
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("Drift detection failed:", err);
  process.exit(1);
});
