# n8n Self-Hosted Deployment Guide

> Status (2026-03-19): legacy reference only. Production scheduler is systemd (`infrastructure/systemd/`).

## Overview

The PolityMarket data pipeline runs on a self-hosted n8n instance. n8n handles the heavy data ingestion (RSS, Telegram, X), LLM evaluation, and pushes JSON artifacts to GitHub. GitHub Actions only handles build + deploy to GitHub Pages.

```
[n8n: Daily 2AM IST]
  → Fetch RSS/Telegram/X data
  → Score with LLM (version-pinned, temp=0)
  → Format JSON artifacts
  → Push to GitHub via Contents API
      ↓
[GitHub Actions: on push to main]
  → npm run build
  → Deploy to GitHub Pages
```

## Prerequisites

- A VPS with Docker installed (recommended: Hetzner CX22 ~€4/mo, DigitalOcean $6/mo)
- A domain pointed to the VPS (for HTTPS webhook URL)
- GitHub Personal Access Token (PAT) with `repo` scope
- Anthropic or OpenAI API key
- (Optional) Telegram Bot Token, X API Bearer Token

## Quick Start

```bash
# Clone the repo
git clone https://github.com/RalbagI/PolityMarket.git
cd PolityMarket/infrastructure/n8n

# Edit docker-compose.yml:
# - Set N8N_BASIC_AUTH_PASSWORD
# - Set N8N_ENCRYPTION_KEY (random 32+ char string)
# - Set WEBHOOK_URL to your domain

# Start n8n
docker compose up -d

# Access the UI
open http://your-server:5678
```

## Credential Setup (in n8n UI)

After first login, configure these credentials in **Settings → Credentials**:

| Credential    | Type        | Fields                          |
| ------------- | ----------- | ------------------------------- |
| Anthropic API | Header Auth | `x-api-key: sk-ant-...`         |
| GitHub PAT    | Header Auth | `Authorization: Bearer ghp_...` |
| Telegram Bot  | Header Auth | Bot token for channel polling   |
| X/Twitter API | Header Auth | Bearer token for list fetching  |
| Alert Webhook | Generic     | Slack/Telegram webhook URL      |

All credentials are stored encrypted in n8n's internal SQLite database using the `N8N_ENCRYPTION_KEY`.

## Import the Workflow

1. In n8n UI, go to **Workflows → Import from File**
2. Select `politymarket-daily-pipeline.json`
3. Configure credential bindings for each HTTP node
4. Activate the workflow

## Workflow Nodes

| Node                  | Purpose                                         | Retries  |
| --------------------- | ----------------------------------------------- | -------- |
| Daily 2AM IST         | Cron trigger (Asia/Jerusalem timezone)          | —        |
| Poll RSS Feeds        | Fetch news headlines per politician             | 3x / 5s  |
| Fetch Telegram Data   | Pull from monitored channels                    | 3x / 5s  |
| Fetch X/Twitter Data  | Pull from monitored lists                       | 3x / 5s  |
| Chunk & Clean Text    | Group data by politician, attach thread context | —        |
| LLM Scoring (Claude)  | CoT prompt, version-pinned, temp=0              | 3x / 10s |
| Parse LLM Response    | Strip markdown fences, validate ranges          | —        |
| Compute Overall Score | Deterministic weighted average from rubrics     | —        |
| Golden Dataset Check  | Weekly MSE evaluation (Sundays only)            | —        |
| Format JSON Artifacts | Split into summary + detail files               | —        |
| Push to GitHub        | Push via Contents API → triggers deploy         | 3x / 5s  |
| Alert on Failure      | Webhook alert to Slack/Telegram                 | —        |

## Error Handling

- **LLM API failures**: 3 retries with 10s exponential backoff
- **GitHub push failures**: 3 retries with 5s backoff
- **Complete pipeline failure**: Alert sent via webhook (configure in credentials)
- **Drift detection**: Golden dataset MSE evaluated weekly; alerts on MSE > 0.15

## Monitoring

- n8n execution history available in **Executions** tab
- Executions auto-pruned after 7 days (`EXECUTIONS_DATA_MAX_AGE=168`)
- Drift log written to `public/data/drift_log.json` (visible on dashboard)

## Production Hardening

1. **HTTPS**: Put n8n behind a reverse proxy (Caddy/nginx) with Let's Encrypt
2. **Backups**: Mount `n8n_data` volume to a backed-up directory
3. **Updates**: Pin n8n image version in docker-compose.yml (e.g., `n8nio/n8n:1.70.0`)
4. **Firewall**: Restrict port 5678 to your IP only
