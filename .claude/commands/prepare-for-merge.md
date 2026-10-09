<!-- AUTOGEN: do not edit; source = AI_Helpers; project = polity_market; workflow = prepare-for-merge -->
Run central AI Helpers workflow `prepare-for-merge`.

Direct command: `/prepare-for-merge [args]`

Description: Final branch readiness workflow. It preserves the old non-read-only prepare-for-merge behavior: preflight, mandatory docs audit, full project gates through the project script, r...

Fail closed if central helpers cannot be found or validated.

```bash
bash scripts/sync-ai-workflows.sh --context --agent claude --workflow "prepare-for-merge"
```

Argument forwarding:
- workflow_input: $ARGUMENTS
- Preserve the user's command arguments exactly and pass them to the
  central workflow as ARGS/TOPIC.
- If this agent leaves a placeholder unresolved, ignore the literal
  placeholder and use the text the user typed after the slash command.

Prepare-for-merge completion guard:
- `scripts/prepare-for-merge.sh` is only the gate runner; do not
  stop when it finishes.
- Continue through the central rich MR-description phase and post a
  comprehensive MR description before reporting success.
- A commit-list-only MR description is invalid; update it before
  starting `/lgtm`.

Read only the files listed in that context plan. This stub is a pointer
only; the workflow source is central:

- `content/workflows/universal/prepare-for-merge.workflow.yaml`
