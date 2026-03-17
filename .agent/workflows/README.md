# AI-First Workflow Format

> This directory contains workflows optimized for AI execution, not human reading.
> Adapted from [Tipi](../../../Tipi/.agent/workflows/) for the PolityMarket React/Vite project.

## Format

All workflows are defined in **YAML** (`.workflow.yaml` files) for deterministic AI parsing.

### File Naming
- **Execution**: `{workflow-id}.workflow.yaml` (use this)

## Structure

Each workflow YAML contains:

```yaml
workflow:
  id: string           # unique ID (e.g., code-review)
  trigger: string      # slash command (e.g., /code-review)
  mode: string         # read-only|write|exec
  agents: int | list   # agent count or types

metadata:
  updated: date
  description: string
  skills: [list]

constraints: {}        # policies and guards

phases:
  - id: string         # phase ID
    name: string       # phase name
    auto: bool         # auto-execute?
    parallel: int      # parallelization count
    steps:
      - name: string
        type: [cmd|check|review|doc]
        cmd: string | [string]
        fail_action: [exit|warn|log]
    next_phase: string
```

## Key Adaptations from Tipi

| Tipi (Flutter/GitLab) | PolityMarket (React/GitHub) |
|---|---|
| `dart analyze` | `npx eslint src/` |
| `dart format` | `npx prettier --check` |
| `flutter test` | `npx vitest run` |
| `flutter build` | `npx vite build` |
| `glab mr` | `gh pr` |
| `glab api` | `gh api` / `gh run` |
| `origin/master` | `origin/main` |
| `monitor-flutter` | `monitor-vite` |
| `fix-crashlytics` | _(not applicable)_ |
| `get-app-check-token` | _(not applicable)_ |

## Workflows

| ID | Trigger | Mode | Purpose |
|---|---|---|---|
| code-review | `/code-review` | read-only | Security-first code review (ESLint, Prettier, secrets, console.logs) |
| handle-review-results | `/handle-review-results` | write | Resolve code-review or monitor-vite findings |
| prepare-for-merge | `/prepare-for-merge` | exec | Sync, test, push, create GitHub PR |
| resolve-issue | `/resolve-issue` | exec | End-to-end GitHub issue resolution |
| ci-failing | `/ci-failing` | exec | Fix failing GitHub Actions jobs |
| sync-main | `/sync-main` | exec | Sync main into current branch |
| get-up-to-speed | `/get-up-to-speed` | read-only | Analyze branch context |
| monitor-vite | `/monitor-vite` | exec | Monitor Vite dev server, report issues |
| context-health | `/context-health` | read-only | Audit project and workflow context health |

## Supporting Scripts

| Script | Location | Purpose |
|---|---|---|
| `workflow-engine.py` | `.agent/bin/` | YAML workflow parser and executor |
| `workflow-memory.py` | `.agent/bin/` | Recall/snapshot/learn memory primitives |
| `gh-issue-view.sh` | `.agent/bin/` | GitHub issue fetcher via `gh` CLI |

---

**Last updated**: 2026-03-17
**Format version**: 1.0 (AI-first)
**Adapted from**: Tipi project workflow system
