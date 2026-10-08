---
description: "Audit AI helper wiring without loading workflow bodies into the project repo."
---
<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = context-health -->
Run central AI Helpers workflow `context-health`.

Direct command: `/prompts:context-health [args]`

Description: Audit AI helper wiring without loading workflow bodies into the project repo.

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent codex --workflow "context-health"
```

Argument forwarding:
- workflow_input: $ARGUMENTS or {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/context-health.workflow.yaml`
