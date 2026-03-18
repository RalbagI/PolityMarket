import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();

// ── Score Computation (same formula as data-pipeline) ──────────────────
const WEIGHT_POLICY = 0.4;
const WEIGHT_HOSTILITY = 0.35;
const WEIGHT_AMPLIFICATION = 0.25;

function computeOverallScore(hostility, policyApproval, mediaAmplification) {
  const policyNormalized = (policyApproval + 1) / 2;
  const inverseHostility = 1 - hostility;
  const raw =
    WEIGHT_POLICY * policyNormalized +
    WEIGHT_HOSTILITY * inverseHostility +
    WEIGHT_AMPLIFICATION * mediaAmplification;
  return parseFloat((raw * 10).toFixed(1));
}

const POLITICIANS = [
  { id: "benjamin-netanyahu", name: "Benjamin Netanyahu", party: "Likud" },
  { id: "yair-lapid", name: "Yair Lapid", party: "Yesh Atid" },
  { id: "benny-gantz", name: "Benny Gantz", party: "National Unity" },
  { id: "bezalel-smotrich", name: "Bezalel Smotrich", party: "Religious Zionism" },
  { id: "avigdor-lieberman", name: "Avigdor Lieberman", party: "Yisrael Beiteinu" },
];

// ── Mock scoring (replace with real LLM call in production) ────────────
async function scorePolitician(politician) {
  // TODO: When ANTHROPIC_API_KEY is set, call Claude API here
  // with the CoT system prompt from data-pipeline/prompts/system-prompt.txt
  const hostility = parseFloat((Math.random() * 0.8).toFixed(2));
  const policyApproval = parseFloat((Math.random() * 2 - 1).toFixed(2));
  const mediaAmplification = parseFloat((0.2 + Math.random() * 0.6).toFixed(2));
  const overallScore = computeOverallScore(hostility, policyApproval, mediaAmplification);

  return {
    politician_id: politician.id,
    name: politician.name,
    party: politician.party,
    hostility_level: hostility,
    policy_approval: policyApproval,
    media_amplification: mediaAmplification,
    overall_score: overallScore,
    chain_of_thought: `ניתוח אוטומטי: ${politician.name} קיבל סיקור מעורב היום.`,
    news_sentiment: parseFloat((((policyApproval + 1) / 2) * 10).toFixed(1)),
    social_sentiment: parseFloat(((1 - hostility) * 10).toFixed(1)),
    media_volume: parseFloat((mediaAmplification * 10).toFixed(1)),
  };
}

// ── GitHub API helpers ──────────────────────────────────────────────────
// After scoring, push updated JSON files to the GitHub repo.
// This triggers the GitHub Actions deploy workflow → Firebase Hosting update.
// Set token via: firebase functions:secrets:set GITHUB_PAT

async function githubGetFile(path, token) {
  const url = `https://api.github.com/repos/RalbagI/PolityMarket/contents/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  return res.json();
}

async function githubPutFile(path, content, message, token, sha) {
  const url = `https://api.github.com/repos/RalbagI/PolityMarket/contents/${path}`;
  const body = { message, content: Buffer.from(content).toString("base64") };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Scheduled function: runs daily at 2:00 AM Israel time.
 * Generates scores, pushes updated JSON to GitHub repo,
 * which triggers GitHub Actions → Firebase Hosting redeploy.
 */
export const dailyPipeline = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Jerusalem",
    region: "europe-west1",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async () => {
    const today = new Date().toISOString().split("T")[0];
    console.log(`📊 PolityMarket Daily Pipeline — ${today}`);

    const githubToken = process.env.GITHUB_PAT || "";
    if (!githubToken) {
      console.error("GITHUB_PAT not set — cannot push to repo");
      return;
    }

    const entries = [];
    for (const politician of POLITICIANS) {
      try {
        const result = await scorePolitician(politician);
        result.date = today;
        entries.push(result);
        console.log(`  ✓ ${politician.name}: ${result.overall_score}`);
      } catch (err) {
        console.error(`  ✗ ${politician.name}: ${err.message}`);
      }
    }

    if (entries.length === 0) {
      console.error("No entries generated — skipping update");
      return;
    }

    // Read existing summary from GitHub
    let summary = [];
    const existingSummary = await githubGetFile("public/data/timeseries_summary.json", githubToken);
    if (existingSummary) {
      summary = JSON.parse(Buffer.from(existingSummary.content, "base64").toString());
    }

    // Append today's entries
    summary = summary.filter((e) => e.date !== today);
    for (const entry of entries) {
      summary.push({
        date: entry.date,
        politician_id: entry.politician_id,
        name: entry.name,
        party: entry.party,
        overall_score: entry.overall_score,
        media_volume: entry.media_volume,
      });
    }
    summary.sort((a, b) => a.date.localeCompare(b.date) || a.politician_id.localeCompare(b.politician_id));

    // Push updated summary to GitHub
    await githubPutFile(
      "public/data/timeseries_summary.json",
      JSON.stringify(summary, null, 2),
      `chore: update daily scores [${today}]`,
      githubToken,
      existingSummary?.sha
    );
    console.log("  → Summary pushed to GitHub");

    // Push daily detail file
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
    }));

    const existingDetail = await githubGetFile(`public/data/details/${today}.json`, githubToken);
    await githubPutFile(
      `public/data/details/${today}.json`,
      JSON.stringify(detailEntries, null, 2),
      `chore: add detail scores [${today}]`,
      githubToken,
      existingDetail?.sha
    );
    console.log("  → Detail pushed to GitHub");

    console.log(`✅ Pipeline complete — ${entries.length} politicians scored, pushed to GitHub`);
  }
);

/**
 * HTTP trigger to manually run the pipeline (for testing).
 * Requires Authorization: Bearer <PIPELINE_AUTH_TOKEN> header.
 * Set token via: firebase functions:secrets:set PIPELINE_AUTH_TOKEN
 */
export const runPipelineManually = onRequest(
  { region: "europe-west1", memory: "512MiB", timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("POST only");
      return;
    }

    // Auth check — reject if token is set and doesn't match
    const authToken = process.env.PIPELINE_AUTH_TOKEN || "";
    if (authToken) {
      const provided = req.headers.authorization?.replace("Bearer ", "");
      if (provided !== authToken) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const entries = [];
    for (const politician of POLITICIANS) {
      try {
        const result = await scorePolitician(politician);
        result.date = today;
        entries.push(result);
      } catch (err) {
        console.error(`Failed: ${politician.name}: ${err.message}`);
      }
    }

    res.json({ date: today, scored: entries.length, entries });
  }
);
