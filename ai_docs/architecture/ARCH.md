---
updated_at: "2026-04-04"
review_cycle_days: 90
scope: System Architecture
---

# PolityMarket Architecture

## Overview

PolityMarket tracks Israeli political momentum from public media coverage.

The system now has two score layers:

- `overall_score` on `0-10`: the canonical deterministic methodological score
- `market_score` on `0-100`: a UI-facing display layer derived from rolling normalization, used for treemap colors, tiers, percentiles, and deltas

## Stack

| Layer     | Technology                                      |
| --------- | ----------------------------------------------- |
| Frontend  | React 19, Vite 8, Tailwind CSS 4                |
| State     | Zustand (store.js)                              |
| Charts    | Recharts (lazy-loaded), d3-hierarchy (treemap)  |
| i18n      | i18next, Hebrew default, RTL                    |
| Hosting   | Firebase Hosting (politymarket.web.app)         |
| Scheduler | systemd timer (`02:00 Asia/Jerusalem`)          |
| Pipeline  | Node.js scripts + Claude CLI (batched, 1M ctx)  |
| Functions | Firebase Cloud Functions (manual endpoint only) |
| CI        | GitHub Actions on self-hosted runners           |

## Data Flow

```
Daily Pipeline (02:00 Asia/Jerusalem)
  → systemd timer starts runner
  → Fetch RSS + Reddit data (config-driven, politician-filtered)
  → Score with LLM (CoT prompt, dimensional rubrics)
  → Compute deterministic raw score (`overall_score`)
  → Apply smoothing + rolling market normalization (`market_score`)
  → Validate with zod schema
  → Retry with exponential backoff
  → Write summary + detail JSON artifacts with raw + market fields
  → Commit + push to origin/main
  → Push triggers GitHub Actions → Firebase deploy
```

## Key Files

| File                                  | Purpose                                    |
| ------------------------------------- | ------------------------------------------ |
| src/App.jsx                           | Root layout: sidebar + treemap + chart     |
| src/store.js                          | Zustand: data, UI state, SWR caching       |
| src/components/Treemap.jsx            | d3-hierarchy squarified treemap            |
| src/components/MethodologyModal.jsx   | In-app methodology and legal copy          |
| src/components/Sidebar.jsx            | Stats panel (desktop fixed, mobile drawer) |
| src/components/SlidePanel.jsx         | Detail panel (slides from inline-end)      |
| data-pipeline/generateDailyScores.js  | Daily score pipeline                       |
| src/lib/marketScore.js                | Market-score normalization + tier helpers  |
| data-pipeline/lib/parseLLMResponse.js | Zod schema validation                      |
| data-pipeline/lib/retry.js            | Exponential backoff                        |
| data-pipeline/validateDrift.js        | Golden dataset MSE + KL/PSI drift          |
| functions/lib/triggerAlerts.js        | Alert fan-out logic                        |
| functions/lib/subscriptionIdentity.js | Deterministic alert subscription IDs       |

## Scoring Formula

```
raw_overall_score = clamp(Σ((active_weight_i / Σactive_weights) × dim_i) × 10 + agenda_bonus, 0, 10)
overall_score = EMA(raw_overall_score, yesterday_overall_score, α = 0.8)
```

Computed deterministically — never by the LLM.

Notes:

- missing dimensions are excluded and their weights are redistributed proportionally before scoring
- `dim_parliamentary_activity` and `dim_legislative_quality` receive wing-relative normalization before the final recompute
- the legacy `0.4 / 0.35 / 0.25` formula now powers only `dim_public_sentiment`, not the top-level `overall_score`

## Market Display Layer

The UI does not expose the raw `overall_score` directly on the main surfaces anymore.

Instead, it derives:

- `market_score` from a 7-day rolling normalization window
- neutral methodological baseline mapped to `50`
- lower and upper display anchors from `P5/P95` with fallback to rolling min/max when percentiles collapse around neutral
- `market_percentile` as same-day tied-average rank
- `market_tier` as `S/A/B/C`
- `market_delta_points` and gated `market_delta_pct` from the previous calendar day only

This keeps the methodology stable while making dense clusters readable in the dashboard.
