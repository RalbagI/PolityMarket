---
trigger: always_on
---

AUTOGEN: do not edit; source = AI_Helpers; project = polity_market

Canonical agent configuration is in `AI_Helpers`.
Before code changes, run `aih doctor --project-root .` and use the
direct generated workflow command, such as `/resolve-issue #999`, for
minimal context. `/aih <workflow-or-command>` is a fallback only.
Preserve text after the slash command as workflow_input/ARGS/TOPIC.
Direct workflow commands for this project: /ci-failing, /claude-code-review, /clcr, /cocr, /code-review, /codex-code-review, /context-health, /cr, /delegate-code-review, /gcr, /gemini-code-review, /get-up-to-speed, /handle-review-results, /hrr, /lgtm, /orc, /orchestrator, /pfm, /prepare-for-merge, /resolve-issue, /ri, /sync-default-branch, /sync-main, /sync-master.
If central helpers are unavailable, stop and run the bootstrap script.
