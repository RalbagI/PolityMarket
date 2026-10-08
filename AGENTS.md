# polity_market AI Agent Instructions

This repository uses centralized AI Helpers.

Local manifest: `.agent/ai-helpers.yml`
Central repo: `https://gitlab.com/TalkPoint/AI_Helpers.git`
Central ref: `main`
Project repo: `RalbagI/PolityMarket`
Project default branch: `main`
Canonical contract: `${AI_HELPERS_HOME:-../AI_Helpers}/docs/ai/agent-contract.md`

## Required Load Order

1. Locate central helpers with `$AI_HELPERS_HOME`, `../AI_Helpers`, or the
   platform cache path.
2. Run `aih doctor --project-root .`.
3. Use the direct generated workflow command, for example
   `/resolve-issue #999`, `/prepare-for-merge`, or `/code-review`.
   `/aih <workflow-or-command>` is only a fallback.
4. The generated command must run
   `aih context --project-root . --agent <agent> --workflow <workflow>`.
5. Read only the files listed in that load plan.

## Quality Gates

- Follow the central contract only after the workflow load plan requires it.
- Keep generated project stubs pointer-only.
- Preserve test failures, paths, line numbers, assertions, stack traces, and exit codes.
- Do not change provider, auth, billing, CI, MCP, release, or security-hook
  behavior without explicit human approval.

## Fail Closed

If central helpers are missing, incompatible, or invalid, stop before modifying
code and run:

```bash
scripts/ai/bootstrap-ai-helpers.sh
```

Windows PowerShell 5.1:

```powershell
scripts\ai\bootstrap-ai-helpers.ps1
```

Do not add rules, workflows, skills, or memory bodies to this repo. Update
`AI_Helpers` instead, then run `aih sync --project-root .`.
