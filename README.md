# PolityMarket

PolityMarket is a React/Vite dashboard for tracking Israeli political momentum from public media coverage.  
The app combines an automated daily data pipeline, deterministic scoring, and a market-style presentation layer that makes tight score clusters readable in the UI.

## What The Product Shows

- `overall_score` on `0-10`: the canonical deterministic methodology score
- `market_score` on `0-100`: the UI-facing display score used in the treemap, detail headers, movers, and charts
- `market_percentile`: same-day relative standing
- `market_tier`: `S`, `A`, `B`, `C`
- `market_delta_points` and `market_delta_pct`: day-over-day movement from the previous calendar day

The display layer exists for UX. It does not replace the underlying deterministic methodology.

## High-Level Flow

1. Daily pipeline collects public content from Hebrew and English news plus selected social platforms.
2. An LLM extracts structured rubric values and reasoning.
3. The pipeline computes a deterministic `overall_score`.
4. A rolling 7-day normalization layer produces `market_score`, tiers, percentiles, and deltas.
5. Artifacts are written to `public/data/**` and deployed to Firebase Hosting.

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

The methodological score is computed deterministically from eight rubric dimensions.  
The LLM generates the inputs, but never the final score directly.

At a high level, the pipeline:

1. derives the eight `dim_*` values
2. redistributes weights proportionally across the dimensions that are actually present
3. applies `agenda_bonus` on the `0-10` scale
4. wing-normalizes `dim_parliamentary_activity` and `dim_legislative_quality`
5. stores the final `overall_score` after EMA smoothing (`alpha = 0.8`)

```text
raw_overall_score = clamp(Σ((active_weight_i / Σactive_weights) × dimension_i) × 10 + agenda_bonus, 0, 10)
overall_score = EMA(raw_overall_score, yesterday_overall_score, α = 0.8)
```

The legacy `0.4 / 0.35 / 0.25` formula still exists, but only inside `dim_public_sentiment` as one sub-score within the 8-dimension model.

### Market Display Layer

Because real-world raw scores cluster tightly, the UI uses an anchored rolling normalization layer:

- rolling window: `7` days
- neutral methodological baseline maps to `50`
- lower and upper bounds use `P5/P95` with min/max fallback when percentiles collapse
- results clamp to `0-100`
- percentile is computed within the same-day cohort
- deltas are computed only against the previous calendar day

Tier mapping:

- `S` = `85+`
- `A` = `65-84`
- `B` = `35-64`
- `C` = `<35`

## Docs

- [ai_docs/architecture/ARCH.md](ai_docs/architecture/ARCH.md)
- [ai_docs/ops/DEPLOY.md](ai_docs/ops/DEPLOY.md)
- [tests/README.md](tests/README.md)
