<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = pfm -->
Run central AI Helpers workflow `pfm`.

Direct command: `/pfm [args]`

Description: Final branch readiness workflow. It preserves the old non-read-only prepare-for-merge behavior: preflight, mandatory docs audit, full project gates through the project script, r...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent cursor --workflow "pfm"
```

Argument forwarding:
- workflow_input: {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/prepare-for-merge.workflow.yaml`
