---
updated_at: "2026-03-19"
review_cycle_days: 90
scope: System Architecture
---

# PolityMarket Architecture

## Overview

Dashboard tracking Israeli politician sentiment via automated LLM analysis.

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
  → Validate with zod schema
  → Retry with exponential backoff
  → Write summary + detail JSON artifacts
  → Commit + push to origin/main
  → Push triggers GitHub Actions → Firebase deploy
```

## Key Files

| File                                  | Purpose                                    |
| ------------------------------------- | ------------------------------------------ |
| src/App.jsx                           | Root layout: sidebar + treemap + chart     |
| src/store.js                          | Zustand: data, UI state, SWR caching       |
| src/components/Treemap.jsx            | d3-hierarchy squarified treemap            |
| src/components/Sidebar.jsx            | Stats panel (desktop fixed, mobile drawer) |
| src/components/SlidePanel.jsx         | Detail panel (slides from inline-end)      |
| data-pipeline/generateDailyScores.js  | Daily score pipeline                       |
| data-pipeline/lib/parseLLMResponse.js | Zod schema validation                      |
| data-pipeline/lib/retry.js            | Exponential backoff                        |
| data-pipeline/validateDrift.js        | Golden dataset MSE + KL/PSI drift          |

## Scoring Formula

```
overall_score = 0.4 * policy_normalized + 0.35 * (1 - hostility) + 0.25 * amplification
```

Computed deterministically — never by the LLM.
