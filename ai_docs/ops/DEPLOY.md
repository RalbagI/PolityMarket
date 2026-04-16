---
updated_at: "2026-04-16"
review_cycle_days: 90
scope: Deployment & CI/CD
---

# Deployment & Operations

## Firebase Hosting

- Project: `politymarket`
- URL: https://politymarket.web.app
- Deploy: `firebase deploy --only hosting`
- Config: `firebase.json` (CSP headers, cache rules, predeploy hooks)

### Predeploy Guard (Fail-Closed)

`scripts/predeploy-hosting-guard.sh` runs as a Firebase predeploy hook
(configured in `firebase.json`). It blocks every deploy unless it can
positively confirm the target is `politymarket`:

1. **`.firebaserc` check** -- default project must equal `politymarket`.
2. **Active project check** -- `GCLOUD_PROJECT` (set by Firebase CLI
   during predeploy) or `firebase use --json` must match. Catches
   `--project` overrides.
3. **Content check** -- `dist/index.html` must exist and must NOT
   contain Tipi references (`tipi.zone`, `tipi-83650`).

The daily pipeline (`scripts/run-daily-pipeline.sh`) also performs its
own fail-closed `.firebaserc` + active-project checks before deploying.

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
