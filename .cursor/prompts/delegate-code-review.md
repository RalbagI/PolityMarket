<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = delegate-code-review -->
Run central AI Helpers workflow `delegate-code-review`.

Direct command: `/delegate-code-review [args]`

Description: One read-only delegated review workflow for Codex, Claude, Gemini, or a future model. It preserves the old project command names while storing only model-specific runner details...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent cursor --workflow "delegate-code-review"
```

Argument forwarding:
- workflow_input: {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/delegate-code-review.workflow.yaml`
