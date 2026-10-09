---
# AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; skill = ai-helpers
name: ai-helpers
description: Load central AI Helpers skills only when selected by a workflow context plan.
---

# AI Helpers Skill Loader

This is the only project-local skill stub. Use:

```bash
WORKFLOW="code-review"
bash scripts/sync-ai-workflows.sh --context --agent claude --workflow "$WORKFLOW"
```

Load only the central skill files listed by that command.
