<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = get-up-to-speed -->
Run central AI Helpers workflow `get-up-to-speed`.

Direct command: `/get-up-to-speed [args]`

Description: Load the smallest useful branch, issue, architecture, docs, and memory context. This is a read-only orientation workflow and must not mutate files.

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent cursor --workflow "get-up-to-speed"
```

Argument forwarding:
- workflow_input: {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/get-up-to-speed.workflow.yaml`
