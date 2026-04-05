---
updated_at: "2026-04-05"
review_cycle_days: 90
scope: Implementation Patterns
---

# Implementation Patterns

## Component Memoization

Heavy components use `React.memo`: Treemap, TrendlineChart, TreemapTooltip.
All event handlers passed to children use `useCallback`.
Data transformations use `useMemo`.

## Data Loading

- Zustand store with stale-while-revalidate (5min TTL)
- Background refetch on window focus
- Fetch deduping via `_summaryFetching` flag
- Detail files cached in `detailCache` map
- Stale data served instantly; errors only set when no cache

## RTL Layout

- `dir="rtl"` on `<html>`
- Sidebar: `inset-inline-start-0` (right in RTL)
- Main content: `md:ms-[260px]` (margin-right in RTL)
- SlidePanel: CSS classes for RTL-aware translate
- Use `text-start`/`text-end` not `text-left`/`text-right`

## i18n

- Hebrew default (`src/i18n.js`)
- `useTranslation` hook for functional components
- `withTranslation` HOC for class components (ErrorBoundary)
- Politician/party names via `localizeName(t, name)` / `localizeParty(t, party)`

## LLM Pipeline Validation

- Zod schemas: `llmResponseSchema`, `dailyEntrySchema`, `summaryRowSchema`
- Markdown fence stripping before JSON parse
- Field-level error messages on validation failure
- `dailyEntrySchema.safeParse` before writing any data

## Retry Pattern

- `data-pipeline/lib/retry.js`: exponential backoff with jitter
- Retries: network errors, 5xx, 429, timeouts
- No retry: 4xx, validation errors
- Max 3 retries, 1s initial, 30s cap

## Sparkline Visualization

- Lightweight SVG micro-visualization for trend display (used in DailyInsights, TopMoversStrip, EntityCard)
- `Sparkline.jsx`: memoized component with `useMemo` for path calculations
- Computes points from input values, normalizes to viewport, draws polyline + gradient fill
- Stroke-dasharray animation (`sparkline-draw` keyframe) for 0.6s enter effect
- Auto-colors: green for rising trend, red for falling, gray for flat
- Stateless: data is passed in, no external dependencies on signal or entity type
