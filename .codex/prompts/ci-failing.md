---
description: "Fetch failed GitHub Actions or GitLab CI jobs, classify the real logs, make the smallest safe fix, run the relevant project gates, commit, push, and leave a clean tree."
---
<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = ci-failing -->
Run central AI Helpers workflow `ci-failing`.

Direct command: `/prompts:ci-failing [args]`

Description: Fetch failed GitHub Actions or GitLab CI jobs, classify the real logs, make the smallest safe fix, run the relevant project gates, commit, push, and leave a clean tree.

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent codex --workflow "ci-failing"
```

Argument forwarding:
- workflow_input: $ARGUMENTS or {{args}}
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/ci-failing.workflow.yaml`
