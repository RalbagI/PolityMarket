# AI-First Workflow Format

> This directory contains workflows optimized for AI execution, not human reading.
> Adapted from [Tipi](../../../Tipi/.agent/workflows/) for the PolityMarket React/Vite project.

## Workflow Chain

```
/resolve-issue → /code-review → /handle-review-results → /prepare-for-merge
```

Each workflow suggests the next one at completion. User can reply "yes" to trigger.

## Workflow Dependency Map

```
resolve-issue ──→ code-review ──→ handle-review-results ──→ prepare-for-merge
     │                                                           │
     └── sync-main (if conflicts)                                └── sync-main

ci-failing ──→ handle-review-results ──→ prepare-for-merge

monitor-vite ──→ handle-review-results

get-up-to-speed (standalone, read-only)
context-health (standalone, read-only)
```

## Workflows

| ID | Trigger | Mode | Purpose |
|---|---|---|---|
| resolve-issue | `/resolve-issue` | exec | End-to-end issue resolution with tests + coverage |
| code-review | `/code-review` | read-only | Security-first review (ESLint, Prettier, secrets, a11y) |
| handle-review-results | `/handle-review-results` | write | Fix all findings from code-review |
| prepare-for-merge | `/prepare-for-merge` | exec | Rebase, validate, push, create PR |
| ci-failing | `/ci-failing` | exec | Fix failing GitHub Actions jobs |
| sync-main | `/sync-main` | exec | Rebase main into current branch |
| get-up-to-speed | `/get-up-to-speed` | read-only | Analyze branch context |
| monitor-vite | `/monitor-vite` | exec | Monitor Vite dev server for errors |
| context-health | `/context-health` | read-only | Audit project structure health |

## Quality Gates (in every code-modifying workflow)

| Check | Command | Fail Action |
|---|---|---|
| ESLint | `npx eslint src/` | exit |
| Prettier | `npx prettier --check "src/**/*"` | warn |
| Tests | `npx vitest run` | exit |
| Coverage | `npx vitest run --coverage` | warn |
| Build | `npx vite build` | exit |

## Shared Scripts

| Script | Usage | Purpose |
|---|---|---|
| `recall-context.sh` | `recall-context.sh <workflow> [--issue ID]` | Recall workflow memory |
| `snapshot.sh` | `snapshot.sh <workflow> <phase>` | Take workflow snapshot |
| `learn.sh` | `learn.sh <workflow> [--topic TOPIC]` | Capture lesson learned |
| `workflow-memory.py` | (called by above scripts) | Memory primitives |
| `gh-issue-view.sh` | `gh-issue-view.sh <number>` | Fetch GitHub issue |

## Key Adaptations from Tipi

| Tipi (Flutter/GitLab) | PolityMarket (React/GitHub) |
|---|---|
| `dart analyze` | `npx eslint src/` |
| `dart format` | `npx prettier --check` |
| `flutter test` | `npx vitest run` |
| `dart run tool/check_diff_coverage.dart` | `npx vitest run --coverage` |
| `flutter build` | `npx vite build` |
| `glab mr` | `gh pr` |
| `origin/master` | `origin/main` |
| `monitor-flutter` | `monitor-vite` |
| `fix-crashlytics` | _(not applicable — web app)_ |
| `get-app-check-token` | _(not applicable — web app)_ |

---

**Last updated**: 2026-03-18
**Format version**: 1.1 (AI-first)
**Adapted from**: Tipi project workflow system
