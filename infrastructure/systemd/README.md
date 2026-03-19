# Systemd Scheduler (Production)

Use these units to make the self-hosted machine the single source of truth for the daily pipeline schedule.

## Install

```bash
sudo cp infrastructure/systemd/politymarket-pipeline.service /etc/systemd/system/
sudo cp infrastructure/systemd/politymarket-pipeline.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now politymarket-pipeline.timer
```

## Verify

```bash
systemctl status politymarket-pipeline.timer
systemctl list-timers politymarket-pipeline.timer
systemctl cat politymarket-pipeline.service
```

## Manual run and logs

```bash
sudo systemctl start politymarket-pipeline.service
journalctl -u politymarket-pipeline.service -n 200 --no-pager
```

## Disable competing Firebase schedule

The repository disables `dailyPipeline` in Cloud Functions code. To apply that in Firebase, deploy functions after timer activation:

```bash
cd functions
npm run deploy
```
