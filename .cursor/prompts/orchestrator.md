<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = orchestrator -->
Run central AI Helpers workflow `orchestrator`.

Direct command: `/orchestrator [args]`

Description: Resolve free-speech SDLC instructions into an ordered workflow chain with memory and self-improvement hooks, while preserving direct workflow commands. When AI Helpers itself is...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent cursor --workflow "orchestrator"
```

Argument forwarding:
- workflow_input: {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/orchestrator.workflow.yaml`
