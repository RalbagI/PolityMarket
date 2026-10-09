<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = lgtm -->
Run central AI Helpers workflow `lgtm`.

Direct command: `/lgtm [args]`

Description: Final PR/MR gate with a guarded Quick Merge handoff: require green head checks, undraft, merge, sync local default branch, classify deploy implications, verify every shipped pro...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent claude --workflow "lgtm"
```

Argument forwarding:
- workflow_input: $ARGUMENTS
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/lgtm.workflow.yaml`
