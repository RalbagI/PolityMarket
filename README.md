# PolityMarket

PolityMarket is a React/Vite dashboard that tracks how Israeli politicians are being talked about in public.  
It turns daily news coverage, public social discussion, and some civic activity data into a simple visual map that non-technical users can scan quickly.

## What The Product Shows

- **Media Climate (default, 0-100):** The main view. It shows whether the current public/media coverage around a politician looks strong, weak, or mixed.
- **Public Support Estimate (0-100, when available):** A more cautious estimate of broader support. If polls exist, it leans on them. If not, it falls back more heavily to media evidence and shows lower confidence.
- **Base Score (0-10):** The internal score the pipeline calculates behind the scenes before it is stretched into a more readable display scale.
- **Percentile:** How a politician ranks compared to everyone else on the same day (e.g., "top 20%").
- **Tier (S / A / B / C):** A letter grade that gives you a quick sense of where someone stands — S is the top tier, C is the lowest.
- **Daily Change:** How much a politician's score went up or down since yesterday, shown in both points and percentage.
- **Treemap size:** By default, a bigger block means the politician got more public attention that day.

## High-Level Flow

1. Every day, the system gathers news articles and social media posts about Israeli politicians.
2. An AI reads the content and extracts structured signals across several categories.
3. A fixed rules-based formula turns those signals into a single base score for each politician.
4. The app presents that score in two ways: a default media-climate view and, when enough evidence exists, a broader public-support estimate with confidence.
5. The results are reshaped into easy-to-read display scores, tiers, percentiles, and daily changes.
6. The published JSON artifacts are deployed to the live site.

## Tech Stack

- Frontend: React 19, Vite 8, Tailwind CSS 4
- State: Zustand
- Visualization: `d3-hierarchy` treemap, Recharts trend charts
- Pipeline: Node.js scripts in `data-pipeline/`
- Hosting/API: Firebase Hosting + Cloud Functions
- CI: GitHub Actions

## Main Paths

- [src/App.jsx](src/App.jsx)
- [src/components/MethodologyModal.jsx](src/components/MethodologyModal.jsx)
- [src/lib/marketScore.js](src/lib/marketScore.js)
- [data-pipeline/generateDailyScores.js](data-pipeline/generateDailyScores.js)
- [functions/index.js](functions/index.js)

## Local Development

```bash
npm ci
npm run dev
```

Useful commands:

- `npm run build`
- `npm run test`
- `npm run test:ci`
- `npm run lint`
- `npm run pipeline`
- `npm run pipeline:validate`
- `npm run pipeline:backfill`
- `npm run pipeline:run`

## Methodology Summary

### In Plain Language

- **Media Climate** means: "How does today's public coverage look around this politician?"
- **Public Support Estimate** means: "Given today's coverage, and polls when available, what is a cautious estimate of broader support?"
- **AI reads the text. The formula sets the score.** The model does not get to invent the final number on its own.
- **0-100 is a display scale.** It exists to make crowded dashboards easier to read. It is not a separate poll.
- **Low confidence means low confidence.** When there is little direct coverage or weak polling anchors, the app says so.

### Deterministic Base Score

Each politician is rated across eight categories. Examples include public sentiment, parliamentary activity, credibility, and field activity. The AI reads the day's material and extracts values for each category. The system then combines those values into a single score using a fixed set of rules.

If some categories have no data on a given day, the weight is spread across the categories that do have data so the score stays fair. A small bonus can be added when a politician is clearly driving the national conversation. Finally, the score is gently blended with yesterday's score so that one unusual day does not cause a wild swing.

In short: the AI helps read the evidence, but the final score always comes from the same formula.

### Market Display Layer

In practice, politicians' base scores tend to be very close together. That makes the dashboard hard to read. The market-style display layer solves this by stretching those small differences across a wider 0-100 scale using the last 7 days as context. An average performer lands around 50, stronger performers score higher, and weaker performers score lower.

Each politician also gets a letter-grade tier based on their market score:

- **S** = 85 and above (top tier)
- **A** = 65 to 84
- **B** = 35 to 64
- **C** = below 35

Daily changes are calculated by comparing today's score to yesterday's, so you can see who's trending up or down.

### Two Signal Modes

- **Media Climate** is the default mode. It reflects the current tone and pressure of the media/public discussion.
- **Public Support Estimate** is a second mode. It tries to filter some of the daily noise and get closer to broader public standing.
- **Confidence matters.** The support estimate is stronger when there are direct polls or broad source coverage, and weaker when it relies mostly on media evidence.

## Docs

- [ai_docs/architecture/ARCH.md](ai_docs/architecture/ARCH.md)
- [ai_docs/ops/DEPLOY.md](ai_docs/ops/DEPLOY.md)
- [tests/README.md](tests/README.md)
