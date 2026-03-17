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

// ── Score Weights ──────────────────────────────────────────────────────
const WEIGHT_POLICY = 0.4;
const WEIGHT_HOSTILITY = 0.35;
const WEIGHT_AMPLIFICATION = 0.25;

// ── Deterministic Score Computation ────────────────────────────────────
// The overall_score is NEVER computed by the LLM. It is a deterministic
// weighted average of the dimensional rubric scores, ensuring consistency
// and eliminating the LLM's capacity for unpredictable subjective leaps.
//
// Formula:
//   overall = WEIGHT_POLICY * policy_normalized
//           + WEIGHT_HOSTILITY * (1 - hostility)
//           + WEIGHT_AMPLIFICATION * amplification
//   policy_normalized = (policy_approval + 1) / 2  →  maps [-1,1] to [0,1]
//   Result scaled to 0-10 for dashboard display.

function computeOverallScore(hostility, policyApproval, mediaAmplification) {
  const policyNormalized = (policyApproval + 1) / 2;
  const inverseHostility = 1 - hostility;
  const raw =
    WEIGHT_POLICY * policyNormalized +
    WEIGHT_HOSTILITY * inverseHostility +
    WEIGHT_AMPLIFICATION * mediaAmplification;
  return parseFloat((raw * 10).toFixed(1));
}

// ── LLM Response Validation ────────────────────────────────────────────
// LLMs sometimes wrap JSON in markdown fences or return malformed output.
// This function strips fences, parses JSON, and validates field ranges.

function parseLLMResponse(raw) {
  const cleaned = raw
    .replace(/^```json?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.chain_of_thought !== "string" ||
    !parsed.chain_of_thought.length
  ) {
    throw new Error("Missing or empty chain_of_thought");
  }
  if (
    typeof parsed.hostility_level !== "number" ||
    parsed.hostility_level < 0 ||
    parsed.hostility_level > 1
  ) {
    throw new Error(
      `Invalid hostility_level: ${parsed.hostility_level} (must be 0.0–1.0)`
    );
  }
  if (
    typeof parsed.policy_approval !== "number" ||
    parsed.policy_approval < -1 ||
    parsed.policy_approval > 1
  ) {
    throw new Error(
      `Invalid policy_approval: ${parsed.policy_approval} (must be -1.0–1.0)`
    );
  }
  if (
    typeof parsed.media_amplification !== "number" ||
    parsed.media_amplification < 0 ||
    parsed.media_amplification > 1
  ) {
    throw new Error(
      `Invalid media_amplification: ${parsed.media_amplification} (must be 0.0–1.0)`
    );
  }
  return parsed;
}

// ── Mock Data-Fetching Functions ───────────────────────────────────────
// In production, replace with real API calls to RSS feeds, X API, Telegram.
// Each social mention MUST include thread_context (k preceding posts) and
// speaker_metadata for sarcasm detection (see report Section 4.2).

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
  // Each mention includes thread_context and speaker_metadata.
  // thread_context: preceding posts in the thread (k-turns) for sarcasm detection.
  // speaker_metadata: identity priors — known satirists have high sarcasm probability.
  const mentions = [
    {
      text: `Great speech by ${politicianName} today!`,
      thread_context: [],
      speaker_metadata: { handle: "@citizen1", known_satirist: false },
    },
    {
      text: `${politicianName} is out of touch with reality`,
      thread_context: [
        `Did anyone watch the Knesset session today?`,
        `${politicianName} just proposed another tone-deaf bill`,
      ],
      speaker_metadata: {
        handle: "@political_watcher",
        known_satirist: false,
      },
    },
    {
      text: `Oh sure, ${politicianName} will definitely fix everything, just like last time`,
      thread_context: [
        `New promises from ${politicianName} about the economy`,
      ],
      speaker_metadata: { handle: "@satire_il", known_satirist: true },
    },
  ];
  console.log(
    `[Social] Fetched ${mentions.length} mentions for ${politicianName}`
  );
  return mentions;
}

// ── LLM System Prompt ─────────────────────────────────────────────────
// Loaded from prompts/system-prompt.txt for easy review and iteration.
// Contains: CoT structure, PDD definition, sarcasm detection rules,
// dimensional rubric schema, and 5 few-shot examples.
//
// ── Hebrew NLP Model Recommendations ──────────────────────────────────
// For production deployments processing Hebrew political text, consider:
//   - DictaLM 2.0: Mistral-based, ~200B tokens Hebrew+English training.
//     Best for QA and sentiment analysis in Hebrew.
//   - Hebrew_Nemo: Mistral Nemo architecture, competitive with 2x larger
//     models. Excels at text classification, sentiment, NER.
//   - HeBERT: Reliable baseline for polarity analysis (non-generative).
//   - DictaBERT: Best for summarization and structured extraction from
//     dense Hebrew political texts.
// When using cloud LLMs (Claude, GPT-4o), always include Hebrew-specific
// instructions and PDD definitions in the system prompt.

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "prompts", "system-prompt.txt"),
  "utf-8"
);

// ── Build User Prompt ──────────────────────────────────────────────────

function buildUserPrompt(politicianName, party, headlines, socialMentions) {
  const headlineBlock = headlines.map((h) => `- ${h}`).join("\n");

  const mentionBlock = socialMentions
    .map((m) => {
      let entry = `- "${m.text}"`;
      if (m.speaker_metadata?.known_satirist) {
        entry += ` [Speaker: known satirist]`;
      }
      if (m.thread_context?.length) {
        entry +=
          "\n  Thread context: " +
          m.thread_context.map((t) => `"${t}"`).join(" → ");
      }
      return entry;
    })
    .join("\n");

  return `Politician: ${politicianName} (${party})

Recent Headlines:
${headlineBlock}

Social Media Mentions (with thread context where available):
${mentionBlock}

Analyze this politician's current public standing. Remember:
1. Write your chain_of_thought analysis FIRST
2. Then output the three dimensional scores
3. Do NOT output an overall_score`;
}

// ── LLM Scoring Function ──────────────────────────────────────────────

async function scorePoliticianWithLLM(
  politicianName,
  party,
  headlines,
  socialMentions
) {
  const userPrompt = buildUserPrompt(
    politicianName,
    party,
    headlines,
    socialMentions
  );

  // ── Option A: Anthropic Claude API ──
  // IMPORTANT: Always pin to a specific, immutable model version to prevent
  // AI Agent Drift (report Section 4.3). Never use rolling tags.
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
  // const message = await client.messages.create({
  //   model: 'claude-sonnet-4-20250514',  // PINNED version — do NOT use 'claude-sonnet-4-latest'
  //   max_tokens: 500,
  //   temperature: 0.0,                    // locked for deterministic output
  //   system: SYSTEM_PROMPT,
  //   messages: [{ role: 'user', content: userPrompt }],
  // });
  // return parseLLMResponse(message.content[0].text);

  // ── Option B: OpenAI API ──
  // IMPORTANT: Pin to dated version, NOT 'gpt-4o'.
  //
  // import OpenAI from 'openai';
  // const openai = new OpenAI(); // uses OPENAI_API_KEY env var
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4o-2024-08-06',         // PINNED version — do NOT use 'gpt-4o'
  //   temperature: 0.0,                    // locked for deterministic output
  //   messages: [
  //     { role: 'system', content: SYSTEM_PROMPT },
  //     { role: 'user', content: userPrompt },
  //   ],
  //   response_format: { type: 'json_object' },
  // });
  // return parseLLMResponse(completion.choices[0].message.content);

  // ── Fallback: Mock scoring (used when no API key is configured) ──
  console.log(
    `[LLM] Using mock scoring for ${politicianName} (no API key configured)`
  );
  const hostility = parseFloat((Math.random() * 0.8).toFixed(2));
  const policyApproval = parseFloat((Math.random() * 2 - 1).toFixed(2));
  const mediaAmplification = parseFloat(
    (0.2 + Math.random() * 0.6).toFixed(2)
  );

  return {
    chain_of_thought: `Mock analysis: ${politicianName} received mixed coverage today. Headlines showed standard political discourse with moderate engagement. Social media reactions were divided, with some sarcastic commentary detected from known satirists. No significant PDD patterns identified in this cycle.`,
    hostility_level: hostility,
    policy_approval: policyApproval,
    media_amplification: mediaAmplification,
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
  summary.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.politician_id.localeCompare(b.politician_id)
  );

  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2));
  console.log(`  → Summary: ${summary.length} total rows`);
}

function writeDetailFile(entries, today) {
  fs.mkdirSync(DETAILS_DIR, { recursive: true });

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

  const detailPath = path.join(DETAILS_DIR, `${today}.json`);
  fs.writeFileSync(detailPath, JSON.stringify(detailEntries, null, 2));
  console.log(`  → Detail: ${detailPath}`);
}

function pruneOldDetails() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  if (!fs.existsSync(DETAILS_DIR)) return;

  const files = fs
    .readdirSync(DETAILS_DIR)
    .filter((f) => f.endsWith(".json"));
  let pruned = 0;
  for (const file of files) {
    const date = file.replace(".json", "");
    if (date < cutoffStr) {
      fs.unlinkSync(path.join(DETAILS_DIR, file));
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(
      `  → Pruned ${pruned} detail files older than ${RETENTION_DAYS} days`
    );
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
  const failures = [];
  for (const politician of POLITICIANS) {
    console.log(`\nProcessing: ${politician.name} (${politician.party})`);

    try {
      const headlines = await fetchRSSHeadlines(politician.name);
      const socialMentions = await fetchSocialMediaMentions(politician.name);
      const llmResult = await scorePoliticianWithLLM(
        politician.name,
        politician.party,
        headlines,
        socialMentions
      );

      // Deterministic overall_score computed from dimensional rubrics — NOT from LLM
      const overallScore = computeOverallScore(
        llmResult.hostility_level,
        llmResult.policy_approval,
        llmResult.media_amplification
      );

      newEntries.push({
        date: today,
        politician_id: politician.id,
        name: politician.name,
        party: politician.party,
        hostility_level: llmResult.hostility_level,
        policy_approval: llmResult.policy_approval,
        media_amplification: llmResult.media_amplification,
        overall_score: overallScore,
        chain_of_thought: llmResult.chain_of_thought,
        // Legacy fields derived from dimensional scores for frontend compatibility
        news_sentiment: parseFloat(
          (((llmResult.policy_approval + 1) / 2) * 10).toFixed(1)
        ),
        social_sentiment: parseFloat(
          ((1 - llmResult.hostility_level) * 10).toFixed(1)
        ),
        media_volume: parseFloat(
          (llmResult.media_amplification * 10).toFixed(1)
        ),
      });

      console.log(
        `  → Hostility: ${llmResult.hostility_level} | Policy: ${llmResult.policy_approval} | Amplification: ${llmResult.media_amplification}`
      );
      console.log(`  → Overall score (deterministic): ${overallScore}`);
    } catch (err) {
      console.error(
        `  ✗ Failed to process ${politician.name}: ${err.message}`
      );
      failures.push(politician.name);
    }
  }

  if (failures.length) {
    console.warn(
      `\n⚠ Skipped ${failures.length} politician(s): ${failures.join(", ")}`
    );
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
