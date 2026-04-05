# PolityMarket

PolityMarket is a React/Vite dashboard for tracking Israeli political momentum from public media coverage.  
The app combines an automated daily data pipeline, deterministic scoring, and a market-style presentation layer that makes tight score clusters readable in the UI.

## What The Product Shows

- **Base Score (0-10):** A daily rating of how much political momentum a politician has, based on media coverage, legislative activity, and public presence.
- **Market Score (0-100):** A rescaled version of the base score that makes it easier to see differences between politicians on the dashboard.
- **Percentile:** How a politician ranks compared to everyone else on the same day (e.g., "top 20%").
- **Tier (S / A / B / C):** A letter grade that gives you a quick sense of where someone stands — S is the top tier, C is the lowest.
- **Daily Change:** How much a politician's score went up or down since yesterday, shown in both points and percentage.

## High-Level Flow

1. Every day, the system gathers news articles and social media posts about Israeli politicians.
2. An AI reads through the content and rates each politician across several categories (media presence, legislation, public sentiment, etc.).
3. Those ratings are combined into a single base score for each politician.
4. The base scores are then compared against the last 7 days to produce the market scores, tiers, percentiles, and daily changes you see on the dashboard.
5. The results are published to the live site.

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

### Deterministic Base Score

Each politician is rated across eight categories (for example, media presence, legislative activity, public sentiment, and more). An AI reads the day's news and assigns a value for each category. The system then combines those values into a single score using a fixed set of rules — the AI provides the inputs, but the final number is always calculated the same way.

If some categories have no data on a given day (e.g., no legislative news), the weight is spread across the categories that do have data so the score stays fair. A small bonus can be added when a politician is driving the national conversation. Finally, the score is gently blended with yesterday's score so that one unusual day doesn't cause a wild swing.

### Market Display Layer

In practice, politicians' base scores tend to be very close together, which makes differences hard to see. The market score solves this by stretching those small differences across a wider 0-100 scale, using the last 7 days as context. An average performer lands around 50, top performers score higher, and underperformers score lower.

Each politician also gets a letter-grade tier based on their market score:

- **S** = 85 and above (top tier)
- **A** = 65 to 84
- **B** = 35 to 64
- **C** = below 35

Daily changes are calculated by comparing today's score to yesterday's, so you can see who's trending up or down.

## Docs

- [ai_docs/architecture/ARCH.md](ai_docs/architecture/ARCH.md)
- [ai_docs/ops/DEPLOY.md](ai_docs/ops/DEPLOY.md)
- [tests/README.md](tests/README.md)
