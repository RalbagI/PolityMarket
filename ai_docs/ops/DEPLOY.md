---
updated_at: "2026-03-19"
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

| Job    | Runs                                                           | Depends On   |
| ------ | -------------------------------------------------------------- | ------------ |
| checks | ESLint + Prettier + secrets scan + npm audit + data validation | —            |
| test   | Vitest with coverage                                           | —            |
| build  | Vite build + chunk size check                                  | checks, test |

Trigger: push to main, PRs, workflow_dispatch.

## Pipeline Scheduler (Source of Truth)

Self-hosted systemd timer on the primary host.

| Unit                            | Purpose                                                     |
| ------------------------------- | ----------------------------------------------------------- |
| `politymarket-pipeline.service` | Runs `scripts/run-daily-pipeline.sh`                        |
| `politymarket-pipeline.timer`   | Daily trigger at `02:00 Asia/Jerusalem` (`Persistent=true`) |

Reference files: `infrastructure/systemd/`.

## Cloud Functions

| Function            | Trigger                   | Region       | Status                       |
| ------------------- | ------------------------- | ------------ | ---------------------------- |
| dailyPipeline       | Scheduled                 | europe-west1 | Disabled (removed from code) |
| runPipelineManually | HTTP POST (auth required) | europe-west1 | Returns 410 (deprecated)     |

## Secrets

| Secret                   | Location                             | Purpose                                                     |
| ------------------------ | ------------------------------------ | ----------------------------------------------------------- |
| GITHUB_TOKEN             | Local pipeline env (`.env.pipeline`) | Non-interactive push to main (optional with SSH deploy key) |
| PIPELINE_AUTH_TOKEN      | Firebase Functions env               | Deprecated manual endpoint auth                             |
| DRIFT_WEBHOOK_URL        | Pipeline env                         | Drift alert webhook                                         |
| FIREBASE_SERVICE_ACCOUNT | GitHub Secrets                       | CI deploy                                                   |

## Monitoring

- Drift detection: `data-pipeline/validateDrift.js`
- Golden dataset: 100 benchmark entries, MSE threshold 0.15
- KL divergence + PSI for distribution drift
- Webhook alerts on threshold breach
