<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = ri -->
Run central AI Helpers workflow `ri`.

Direct command: `/ri [args]`

Description: Resolve a GitHub/GitLab issue or free-text task end to end with project-specific builder rules, tests selected before editing, atomic commits, coverage, and memory capture.

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent cursor --workflow "ri"
```

Argument forwarding:
- workflow_input: {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/resolve-issue.workflow.yaml`
