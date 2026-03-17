import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────
const POLITICIANS = [
  { name: 'Benjamin Netanyahu', party: 'Likud' },
  { name: 'Yair Lapid', party: 'Yesh Atid' },
  { name: 'Benny Gantz', party: 'National Unity' },
  { name: 'Bezalel Smotrich', party: 'Religious Zionism' },
  { name: 'Avigdor Lieberman', party: 'Yisrael Beiteinu' },
];

const DATA_PATH = path.resolve(__dirname, '../public/data/historical_scores.json');

// ── Mock Data-Fetching Functions ───────────────────────────────────────
// In production, replace these with real API calls to RSS feeds, Twitter/X API, etc.

async function fetchRSSHeadlines(politicianName) {
  // Mock: returns simulated headlines for a politician
  const headlines = [
    `${politicianName} addresses Knesset on new policy proposal`,
    `${politicianName} faces criticism from opposition leaders`,
    `${politicianName} praised for recent diplomatic efforts`,
  ];
  console.log(`[RSS] Fetched ${headlines.length} headlines for ${politicianName}`);
  return headlines;
}

async function fetchSocialMediaMentions(politicianName) {
  // Mock: returns simulated social media mentions
  const mentions = [
    { text: `Great speech by ${politicianName} today!`, sentiment: 'positive' },
    { text: `${politicianName} is out of touch with reality`, sentiment: 'negative' },
    { text: `Interesting policy from ${politicianName}, need to see more details`, sentiment: 'neutral' },
  ];
  console.log(`[Social] Fetched ${mentions.length} mentions for ${politicianName}`);
  return mentions;
}

// ── LLM Scoring Function ──────────────────────────────────────────────
// Structure for calling an LLM API to analyze and score the collected data.
// Supports both OpenAI and Anthropic SDKs.

async function scorePoliticianWithLLM(politicianName, party, headlines, socialMentions) {
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
${headlines.map((h) => `- ${h}`).join('\n')}

Social Media Mentions:
${socialMentions.map((m) => `- [${m.sentiment}] ${m.text}`).join('\n')}

Analyze and score this politician's current public standing.`;

  // ── Option A: Anthropic Claude API ──
  // Uncomment and install: npm install @anthropic-ai/sdk
  //
  // import Anthropic from '@anthropic-ai/sdk';
  // const client = new Anthropic(); // uses ANTHROPIC_API_KEY env var
  // const message = await client.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 300,
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
  //   model: 'gpt-4o',
  //   messages: [
  //     { role: 'system', content: systemPrompt },
  //     { role: 'user', content: userPrompt },
  //   ],
  //   response_format: { type: 'json_object' },
  // });
  // return JSON.parse(completion.choices[0].message.content);

  // ── Fallback: Mock scoring (used when no API key is configured) ──
  console.log(`[LLM] Using mock scoring for ${politicianName} (no API key configured)`);
  return {
    news_sentiment: parseFloat((4 + Math.random() * 4).toFixed(1)),
    social_sentiment: parseFloat((3 + Math.random() * 5).toFixed(1)),
    media_volume: parseFloat((4 + Math.random() * 5).toFixed(1)),
    overall_score: parseFloat((4 + Math.random() * 4).toFixed(1)),
    llm_reasoning: `Automated daily analysis: ${politicianName} showed mixed signals in today's news cycle with moderate public engagement.`,
  };
}

// ── Main Pipeline ──────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log(`\n📊 PoliticMarket Daily Pipeline — ${today}\n`);

  // Load existing data
  let historicalData = [];
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    historicalData = JSON.parse(raw);
    console.log(`Loaded ${historicalData.length} existing records.`);
  } catch {
    console.log('No existing data found. Starting fresh.');
  }

  // Check if today's data already exists
  const todayEntries = historicalData.filter((entry) => entry.date === today);
  if (todayEntries.length === POLITICIANS.length) {
    console.log(`Data for ${today} already exists. Skipping.`);
    return;
  }

  // Remove any partial today entries
  historicalData = historicalData.filter((entry) => entry.date !== today);

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

    const entry = {
      id: `${politician.name.toLowerCase().replace(/\s+/g, '-')}-${today}`,
      date: today,
      name: politician.name,
      party: politician.party,
      ...scores,
    };

    newEntries.push(entry);
    console.log(`  → Overall score: ${scores.overall_score}`);
  }

  // Append new entries and save
  historicalData.push(...newEntries);

  // Keep only last 30 days of data to prevent unbounded growth
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  const cutoff = cutoffDate.toISOString().split('T')[0];
  historicalData = historicalData.filter((entry) => entry.date >= cutoff);

  fs.writeFileSync(DATA_PATH, JSON.stringify(historicalData, null, 2));
  console.log(`\n✅ Saved ${historicalData.length} total records to ${DATA_PATH}`);
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
