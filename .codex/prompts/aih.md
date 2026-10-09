---
description: "Run any central AI Helpers workflow with minimal context."
---
<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; command = aih -->
Generic fallback for central AI Helpers workflows.

Prefer the direct generated workflow commands, for example
`/resolve-issue #999`, `/prepare-for-merge`, or `/code-review`.
Use this command only when a direct workflow command is missing or when
running an enabled non-workflow command skill.

Usage: `/aih <workflow-or-command> [args]`

Examples:
- `/aih prepare-for-merge`
- `/aih code-review`
- `/aih codex-code-review`
- `/aih caveman full`

Fail closed if central helpers cannot be found or validated.

Argument parsing:
- raw_args: $ARGUMENTS or {{args}}
- workflow_or_command: first token in raw_args
- workflow_input: remaining raw_args after workflow_or_command
- If workflow_or_command is empty, stop and ask for a workflow or command.
- Preserve workflow_input exactly as ARGS/TOPIC for the selected central workflow.

```bash
WORKFLOW_OR_COMMAND="<first token after /aih>"
WORKFLOW_INPUT="<remaining text after workflow-or-command>"
bash scripts/sync-ai-workflows.sh --context --agent codex --workflow "$WORKFLOW_OR_COMMAND"
```

Read only the files listed in that context plan. Do not read project-local
generated stubs as workflow source.
