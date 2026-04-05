---
updated_at: "2026-04-04"
review_cycle_days: 90
scope: System Architecture
---

# PolityMarket Architecture

## Overview

PolityMarket tracks Israeli political momentum from public coverage.

Plain-English summary:

- `Media Climate` is the default reading of the dashboard. It answers: "How does the public/media conversation around this politician look right now?"
- `Public Support Estimate` is a second, more cautious track. It answers: "Using today's evidence, and polls when available, what is the best estimate of broader support?"
- The AI reads text and extracts structured inputs.
- The scoring rules calculate the final number.
- The `0-100` score is a display layer that makes small differences easier to see.

The system now has two score layers:

- `overall_score` on `0-10`: the internal deterministic score
- `market_score` on `0-100`: the main UI-facing display score for media climate
- `consensus_proxy` on `0-100` when available: the public-support estimate with confidence bounds

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
  → Score with LLM (extract structured daily signals)
  → Compute deterministic raw score (`overall_score`)
  → Compute public-support estimate when enough evidence exists
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

The important part in plain language: the model helps read the evidence, but it does not directly choose the final score. The final score is computed deterministically from fixed rules.

Notes:

- missing dimensions are excluded and their weights are redistributed proportionally before scoring
- `dim_parliamentary_activity` and `dim_legislative_quality` receive wing-relative normalization before the final recompute
- the legacy `0.4 / 0.35 / 0.25` formula now powers only `dim_public_sentiment`, not the top-level `overall_score`

## Display Layer

The UI does not expose the raw `overall_score` directly on the main surfaces anymore.

Instead, it derives:

- `market_score` from a 7-day rolling normalization window
- neutral methodological baseline mapped to `50`
- lower and upper display anchors from `P5/P95` with fallback to rolling min/max when percentiles collapse around neutral
- `market_percentile` as same-day tied-average rank
- `market_tier` as `S/A/B/C`
- `market_delta_points` and gated `market_delta_pct` from the previous calendar day only

This keeps the methodology stable while making dense clusters readable in the dashboard.

In plain language: the `0-100` score is there so humans can actually see the difference between crowded mid-range values.

## Consensus Track

The `consensus_proxy` tries to be more careful than raw media tone.

- If direct polling exists, it leans on that.
- If only party polling exists, it blends that with media evidence.
- If there are no useful polls, it can still produce a media-only estimate, but confidence should be lower.

This is why the UI shows confidence and source labels instead of pretending every score has the same certainty.
