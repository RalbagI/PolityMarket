---
updated_at: "2026-03-18"
review_cycle_days: 90
scope: System Architecture
---

# PolityMarket Architecture

## Overview

Dashboard tracking Israeli politician sentiment via automated LLM analysis.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| State | Zustand (store.js) |
| Charts | Recharts (lazy-loaded), d3-hierarchy (treemap) |
| i18n | i18next, Hebrew default, RTL |
| Hosting | Firebase Hosting (politymarket.web.app) |
| Functions | Firebase Cloud Functions (europe-west1) |
| Pipeline | Node.js scripts (data-pipeline/) |
| CI | GitHub Actions on self-hosted runners |

## Data Flow

```
Daily Pipeline (2AM IST)
  → Fetch RSS/Telegram/X data
  → Score with LLM (CoT prompt, dimensional rubrics)
  → Validate with zod schema
  → Retry with exponential backoff
  → Write summary + detail JSON to repo
  → Push triggers GitHub Actions → Firebase deploy
```

## Key Files

| File | Purpose |
|---|---|
| src/App.jsx | Root layout: sidebar + treemap + chart |
| src/store.js | Zustand: data, UI state, SWR caching |
| src/components/Treemap.jsx | d3-hierarchy squarified treemap |
| src/components/Sidebar.jsx | Stats panel (desktop fixed, mobile drawer) |
| src/components/SlidePanel.jsx | Detail panel (slides from inline-end) |
| data-pipeline/generateDailyScores.js | Daily score pipeline |
| data-pipeline/lib/parseLLMResponse.js | Zod schema validation |
| data-pipeline/lib/retry.js | Exponential backoff |
| data-pipeline/validateDrift.js | Golden dataset MSE + KL/PSI drift |

## Scoring Formula

```
overall_score = 0.4 * policy_normalized + 0.35 * (1 - hostility) + 0.25 * amplification
```

Computed deterministically — never by the LLM.
