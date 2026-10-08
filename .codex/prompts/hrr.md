---
description: "Resolve the current review report with no silent deferrals. It preserves Traidan's stale-report pruning and relevance validation, plus Tipi's targeted proof, memory capture, and..."
---
<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = hrr -->
Run central AI Helpers workflow `hrr`.

Direct command: `/prompts:hrr [args]`

Description: Resolve the current review report with no silent deferrals. It preserves Traidan's stale-report pruning and relevance validation, plus Tipi's targeted proof, memory capture, and...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent codex --workflow "hrr"
```

Argument forwarding:
- workflow_input: $ARGUMENTS or {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/handle-review-results.workflow.yaml`
