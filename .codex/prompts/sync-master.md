---
description: "Merge the project default branch into the current feature branch, resolve conflicts, run a scoped smoke check, commit the merge, and leave a clean tree. It preserves both old na..."
---
<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = sync-master -->
Run central AI Helpers workflow `sync-master`.

Direct command: `/prompts:sync-master [args]`

Description: Merge the project default branch into the current feature branch, resolve conflicts, run a scoped smoke check, commit the merge, and leave a clean tree. It preserves both old na...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent codex --workflow "sync-master"
```

Argument forwarding:
- workflow_input: $ARGUMENTS or {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/sync-default-branch.workflow.yaml`
