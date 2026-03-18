---
updated_at: "2026-03-18"
review_cycle_days: 90
scope: Deployment & CI/CD
---

# Deployment & Operations

## Firebase Hosting

- Project: `politymarket`
- URL: https://politymarket.web.app
- Deploy: `firebase deploy --only hosting`
- Config: `firebase.json` (CSP headers, cache rules)

## CI Pipeline (GitHub Actions)

Self-hosted runners (5 instances on same machine).

| Job | Runs | Depends On |
|---|---|---|
| checks | ESLint + Prettier + secrets scan + npm audit + data validation | — |
| test | Vitest with coverage | — |
| build | Vite build + chunk size check | checks, test |

Trigger: push to main, PRs, workflow_dispatch.

## Cloud Functions

| Function | Trigger | Region |
|---|---|---|
| dailyPipeline | Scheduled 2AM IST | europe-west1 |
| runPipelineManually | HTTP POST (auth required) | europe-west1 |

## Secrets

| Secret | Location | Purpose |
|---|---|---|
| GITHUB_PAT | Firebase Functions env | Push data to repo |
| PIPELINE_AUTH_TOKEN | Firebase Functions env | Manual trigger auth |
| DRIFT_WEBHOOK_URL | Pipeline env | Drift alert webhook |
| FIREBASE_SERVICE_ACCOUNT | GitHub Secrets | CI deploy |

## Monitoring

- Drift detection: `data-pipeline/validateDrift.js`
- Golden dataset: 100 benchmark entries, MSE threshold 0.15
- KL divergence + PSI for distribution drift
- Webhook alerts on threshold breach
