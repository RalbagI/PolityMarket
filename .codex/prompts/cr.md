---
description: "Security-first, multi-lane read-only review for the current branch. It combines Tipi's scope/static-sentinel discipline with Traidan's architecture, IPC, hot-path, and verificat..."
---
<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = cr -->
Run central AI Helpers workflow `cr`.

Direct command: `/prompts:cr [args]`

Description: Security-first, multi-lane read-only review for the current branch. It combines Tipi's scope/static-sentinel discipline with Traidan's architecture, IPC, hot-path, and verificat...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent codex --workflow "cr"
```

Argument forwarding:
- workflow_input: $ARGUMENTS or {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/code-review.workflow.yaml`
