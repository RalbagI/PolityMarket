import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────
const POLITICIANS = [
  { id: "benjamin-netanyahu", name: "Benjamin Netanyahu", party: "Likud" },
  { id: "yair-lapid", name: "Yair Lapid", party: "Yesh Atid" },
  { id: "benny-gantz", name: "Benny Gantz", party: "National Unity" },
  {
    id: "bezalel-smotrich",
    name: "Bezalel Smotrich",
    party: "Religious Zionism",
  },
  {
    id: "avigdor-lieberman",
    name: "Avigdor Lieberman",
    party: "Yisrael Beiteinu",
  },
];

const DATA_DIR = path.resolve(__dirname, "../public/data");
const SUMMARY_PATH = path.join(DATA_DIR, "timeseries_summary.json");
const DETAILS_DIR = path.join(DATA_DIR, "details");
const RETENTION_DAYS = 90;

// ── Mock Data-Fetching Functions ───────────────────────────────────────
// In production, replace these with real API calls to RSS feeds, Twitter/X API, etc.

async function fetchRSSHeadlines(politicianName) {
  const headlines = [
    `${politicianName} addresses Knesset on new policy proposal`,
    `${politicianName} faces criticism from opposition leaders`,
    `${politicianName} praised for recent diplomatic efforts`,
  ];
  console.log(
    `[RSS] Fetched ${headlines.length} headlines for ${politicianName}`
  );
  return headlines;
}

async function fetchSocialMediaMentions(politicianName) {
  const mentions = [
    {
      text: `Great speech by ${politicianName} today!`,
      sentiment: "positive",
    },
    {
      text: `${politicianName} is out of touch with reality`,
      sentiment: "negative",
    },
    {
      text: `Interesting policy from ${politicianName}, need to see more details`,
      sentiment: "neutral",
    },
  ];
  console.log(
    `[Social] Fetched ${mentions.length} mentions for ${politicianName}`
  );
  return mentions;
}

// ── LLM Scoring Function ──────────────────────────────────────────────
// Structure for calling an LLM API to analyze and score the collected data.
// Supports both OpenAI and Anthropic SDKs.

async function scorePoliticianWithLLM(
  politicianName,
  party,
  headlines,
  socialMentions
) {
  const systemPrompt = `You are a political analyst AI. Given news headlines and social media mentions about an Israeli politician, provide a JSON object with these numeric scores (0-10 scale):
- news_sentiment: How positive/negative the news coverage is
- social_sentiment: How positive/negative social media sentiment is
- media_volume: How much media attention they are receiving (relative to baseline)
- overall_score: A weighted composite score
- llm_reasoning: A single sentence explaining today's score

Respond ONLY with valid JSON matching this schema:
{
  "news_sentiment": number,
  "social_sentiment": number,
  "media_volume": number,
  "overall_score": number,
  "llm_reasoning": "string"
}`;

  const userPrompt = `Politician: ${politicianName} (${party})

Recent Headlines:
${headlines.map((h) => `- ${h}`).join("\n")}

Social Media Mentions:
${socialMentions.map((m) => `- [${m.sentiment}] ${m.text}`).join("\n")}

Analyze and score this politician's current public standing.`;

  // ── Option A: Anthropic Claude API ──
  // Uncomment and install: npm install @anthropic-ai/sdk
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
  // const message = await client.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 300,
  //   temperature: 0.0,
  //   system: systemPrompt,
  //   messages: [{ role: 'user', content: userPrompt }],
  // });
  // return JSON.parse(message.content[0].text);

  // ── Option B: OpenAI API ──
  // Uncomment and install: npm install openai
  //
  // import OpenAI from 'openai';
  // const openai = new OpenAI(); // uses OPENAI_API_KEY env var
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o-2024-08-06',  // pinned version, NOT 'gpt-4o'
  //   temperature: 0.0,
  //   messages: [
  //     { role: 'system', content: systemPrompt },
  //     { role: 'user', content: userPrompt },
  //   ],
  //   response_format: { type: 'json_object' },
  // });
  // return JSON.parse(completion.choices[0].message.content);

  // ── Fallback: Mock scoring (used when no API key is configured) ──
  console.log(
    `[LLM] Using mock scoring for ${politicianName} (no API key configured)`
  );
  return {
    news_sentiment: parseFloat((4 + Math.random() * 4).toFixed(1)),
    social_sentiment: parseFloat((3 + Math.random() * 5).toFixed(1)),
    media_volume: parseFloat((4 + Math.random() * 5).toFixed(1)),
    overall_score: parseFloat((4 + Math.random() * 4).toFixed(1)),
    llm_reasoning: `Automated daily analysis: ${politicianName} showed mixed signals in today's news cycle with moderate public engagement.`,
  };
}

// ── Artifact Writers ─────────────────────────────────────────────────

function appendToSummary(entries, today) {
  let summary = [];
  try {
    summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf-8"));
  } catch {
    // Starting fresh
  }

  // Remove any existing entries for today
  summary = summary.filter((e) => e.date !== today);

  // Append lightweight summary rows
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

  // Sort by date then politician_id for consistency
  summary.sort((a, b) => a.date.localeCompare(b.date) || a.politician_id.localeCompare(b.politician_id));

  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary));
  console.log(`  → Summary: ${summary.length} total rows`);
}

function writeDetailFile(entries, today) {
  fs.mkdirSync(DETAILS_DIR, { recursive: true });

  const detailEntries = entries.map((e) => ({
    politician_id: e.politician_id,
    name: e.name,
    party: e.party,
    news_sentiment: e.news_sentiment,
    social_sentiment: e.social_sentiment,
    media_volume: e.media_volume,
    overall_score: e.overall_score,
    llm_reasoning: e.llm_reasoning,
  }));

  const detailPath = path.join(DETAILS_DIR, `${today}.json`);
  fs.writeFileSync(detailPath, JSON.stringify(detailEntries, null, 2));
  console.log(`  → Detail: ${detailPath}`);
}

function pruneOldDetails() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  if (!fs.existsSync(DETAILS_DIR)) return;

  const files = fs.readdirSync(DETAILS_DIR).filter((f) => f.endsWith(".json"));
  let pruned = 0;
  for (const file of files) {
    const date = file.replace(".json", "");
    if (date < cutoffStr) {
      fs.unlinkSync(path.join(DETAILS_DIR, file));
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`  → Pruned ${pruned} detail files older than ${RETENTION_DAYS} days`);
  }
}

// ── Main Pipeline ──────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n📊 PolityMarket Daily Pipeline — ${today}\n`);

  // Check if today's detail file already exists
  const todayDetailPath = path.join(DETAILS_DIR, `${today}.json`);
  if (fs.existsSync(todayDetailPath)) {
    console.log(`Data for ${today} already exists. Skipping.`);
    return;
  }

  // Generate scores for each politician
  const newEntries = [];
  for (const politician of POLITICIANS) {
    console.log(`\nProcessing: ${politician.name} (${politician.party})`);

    const headlines = await fetchRSSHeadlines(politician.name);
    const socialMentions = await fetchSocialMediaMentions(politician.name);
    const scores = await scorePoliticianWithLLM(
      politician.name,
      politician.party,
      headlines,
      socialMentions
    );

    newEntries.push({
      date: today,
      politician_id: politician.id,
      name: politician.name,
      party: politician.party,
      ...scores,
    });

    console.log(`  → Overall score: ${scores.overall_score}`);
  }

  // Write both artifact types
  console.log("\nWriting artifacts...");
  appendToSummary(newEntries, today);
  writeDetailFile(newEntries, today);

  // Prune old detail files beyond retention window
  pruneOldDetails();

  console.log(`\n✅ Pipeline complete for ${today}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
