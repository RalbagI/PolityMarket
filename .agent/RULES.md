---
updated_at: "2026-04-06"
review_cycle_days: 365
---

# Agent Rules & Configuration

> **Single source of truth for all AI agents (Claude, GPT, Gemini, etc.)**
> All agents MUST read and follow these rules.

## CRITICAL: Zero Uncommitted Changes Policy

### NEVER LEAVE UNCOMMITTED CHANGES - THIS IS FORBIDDEN

After EVERY operation that modifies files:

1. Check: `git status --porcelain`
2. If not empty: commit changes (code only, NO push)
3. Verify: `git status --porcelain` returns empty

Leaving uncommitted changes is a CRITICAL failure. Always verify clean state before finishing.

## CRITICAL: Git Push Policy

Only `/prepare-for-merge` and `/ci-failing` may push. All other workflows: commit only, then use `/prepare-for-merge`.

## CRITICAL: Unified Structure Requirements

**When asked to modify rules, skills, workflows, or add new agent capabilities:**

1. **ALWAYS modify files in `.agent/`** - Never create tool-specific files
2. **Skills** -> Add to `.agent/skills/`
3. **Workflows** -> Add to `.agent/workflows/`
4. **Rules/Config** -> Modify `.agent/RULES.md` or `.agent/config/`
5. **Lessons Learned** -> Add to `.agent/lessons_learned.md`
6. **MCP Servers** -> Update `.agent/config/mcp.json` AND sync to `.claude/mcp.json`

**NEVER create:**

- New `CLAUDE.md` content beyond pointer references
- Tool-specific skills in `.claude/skills/`
- Duplicate workflows in tool-specific directories

**Pointer files in root (`CLAUDE.md`) should remain small pointers only.**

---

## Meta

- **lines.max**: 350
- **compression.mandate**: [strip_verbose, one_lesson_format, merge_duplicates]
- **keep**: [rules, commands, paths, thresholds, filenames]

## Project

- **stack**: React 19, Vite 8, Tailwind CSS 4, Zustand, d3-hierarchy, Recharts, Firebase
- **hosting**: Firebase Hosting + Cloud Functions (nodejs22)
- **data_pipeline**: Node.js scripts + Claude CLI (batched)
- **i18n**: i18next (Hebrew default, RTL)
- **env**: Linux bash
- **git.main**: protected (use feature branches)
- **git.remote**: GitHub (use `gh` CLI)
- **git.default_branch**: main

## MCP Servers

All agents must use the configured MCP servers in `.agent/config/mcp.json`:

- **firebase**: For Firestore operations, Cloud Functions logs, security rules, hosting management

## Context Positioning (for prompt construction)

- Static content (rules, skill schemas, tool definitions) -> top of prompt
- Dynamic content (current branch state, issue details, recall results) -> end of prompt
- Rationale: Static-at-top enables prompt caching; dynamic-at-end preserves cache prefix

## Coverage

- **gate**: `npx vitest run --coverage`
- **unit**: `npx vitest run --config vitest.unit.config.js`
- **component**: `npx vitest run --config vitest.component.config.js`
- **integration**: `npx vitest run --config vitest.integration.config.js`
- **e2e**: `npx playwright test`

## Skills Index (read full SKILL.md only when triggered)

| Skill | Location | Trigger |
|-------|----------|---------|
| politymarket-builder | `.agent/skills/politymarket-builder/SKILL.md` | ANY code change (MANDATORY) |
| security | `.agent/skills/security/SKILL.md` | auth, secrets, firestore rules, cloud functions, XSS |
| node-security-audit | `.agent/skills/node-security-audit/SKILL.md` | npm audit, dependency review |
| interaction-design | `.agent/skills/interaction-design/SKILL.md` | UI animations, transitions, motion |
| web-design-guidelines | `.agent/skills/web-design-guidelines/SKILL.md` | UI review, accessibility audit |
| micro-interactions | `.agent/skills/micro-interactions/SKILL.md` | button states, toggles, form validation |
| doc-coauthoring | `.agent/skills/doc-coauthoring/SKILL.md` | documentation updates |

## MANDATORY Rules

1. The politymarket-builder skill MUST be used for ALL code changes
2. Maintain test coverage for all code changes
3. Check `.agent/lessons_learned.md` for known patterns and solutions BEFORE implementing fixes
4. Use `gh run view --log-failed` FIRST for debugging CI - never ask user for logs
5. **Zero Uncommitted Changes**: Never leave uncommitted changes; commit immediately after verification
6. Always run `npx prettier --write` on changed files before committing

## Anti-Patterns (STRICTLY FORBIDDEN)

- **No Flutter/Dart**: Do not suggest Flutter, Dart, or Riverpod patterns. This is a React + Firebase project.
- **No SQL/Prisma**: Do not suggest SQL, Postgres, or Prisma. Use Firestore/NoSQL and Firebase Admin SDK.
- **No Tailwind v3 syntax**: Use `@import "tailwindcss"` not `@tailwind` directives. No `sm:ltr:` compound variants.
- **No `npm install` without `--legacy-peer-deps`**: Required due to Vite 8 / Tailwind CSS 4 peer dependency conflicts.

## BWC: Zero-Breaking-Change Policy

- **Firestore fields**: New = optional w/ defaults. NEVER remove/rename.
- **Cloud Functions**: NEVER modify callable signatures. Create V2.
- **Zod schemas**: New fields = `.optional()`. NEVER remove fields.
- **Firestore rules**: NEVER remove from `hasOnly`. Only ADD fields.

## Lessons Learned (Summary)

See `.agent/lessons_learned.md` for detailed patterns. Key lessons:

| Issue | Fix |
|-------|-----|
| npm.peer_deps | `--legacy-peer-deps` for Vite 8 + Tailwind CSS 4 |
| tailwind.v4_import | `@import "tailwindcss"` not `@tailwind` |
| d3.rgb_not_hex | Handle both `rgb()` and `#hex` in color parsing |
| rtl.margin | `margin-inline-start` = margin-right in RTL |
| tailwind.compound_variants | `sm:ltr:` broken in v4; use CSS `[dir="rtl"]` |
| useCallback.state_deps | Use `useStore.getState()` not state in deps |
| zod.safeParse | Strips extra fields; use safeParse for errors |
| promise.allSettled | Never throws; returns partial struct on failure |
| zod.nullable_chain | Update ALL schemas when making field nullable |
| webhook.ssrf | Validate URLs (HTTPS only, reject private IPs) |
| prettier.before_commit | Format changed files before first commit |

## CI Configuration

- **ci.platform**: GitHub Actions (self-hosted runners)
- **ci.workflow**: `.github/workflows/ci.yml` (CI Test Pyramid)
- **ci.deploy**: `.github/workflows/daily-update.yml` (Firebase deploy)
- **ci.security**: `.github/workflows/codeql.yml` (weekly CodeQL)
- **ci.timing**: ~30min full pyramid
- **ci.stages**: fast_checks -> unit -> component -> integration -> build -> e2e

## Workflows

10 AI-first YAML workflows in `.agent/workflows/`:

| Command | Purpose |
|---------|---------|
| `/resolve-issue` | End-to-end GitHub issue resolution |
| `/code-review` | Read-only security-first code review |
| `/handle-review-results` | Fix all review findings |
| `/prepare-for-merge` | Rebase, test, push, create PR |
| `/mts` | Verify CI, squash merge, cleanup, deploy Firebase |
| `/ci-failing` | Analyze and fix GitHub Actions failures |
| `/sync-main` | Merge latest main into branch |
| `/get-up-to-speed` | Onboard to current branch context |
| `/monitor-vite` | Monitor Vite dev server for errors |
| `/context-health` | Audit project structure health |

### Typical Flow

1. `/resolve-issue` -> implement fix
2. `/code-review` -> get report
3. `/handle-review-results` -> fix all findings
4. `/prepare-for-merge` -> push and create PR
5. `/mts` -> verify CI, merge, deploy

### Push Policy

Only `/prepare-for-merge` and `/ci-failing` may push.

## Branching & Review

- **branches**: [feature/, fix/, hotfix/, refactor/, docs/] (never main)
- **pr.tool**: `gh pr create`

## Code Standards

- **encoding**: UTF-8
- **todos**: "TODO: #ISSUE_NUMBER" (forbidden: FUTURE, SKIP, FIXME, XXX)
- **ui**: [minimal, responsive, accessible, RTL-first, fast]

## Directory Structure

```text
.agent/
  RULES.md              # This file - main rules
  README.md             # System overview
  config/
    mcp.json            # MCP server configuration
    workflow-schema.yaml # Workflow format specification
  skills/
    politymarket-builder/ # Main builder skill (MANDATORY)
      SKILL.md
    security/           # Web security + Cloud Functions
      SKILL.md
    node-security-audit/ # npm security audit
      SKILL.md
    interaction-design/ # UI motion + transitions
      SKILL.md
    web-design-guidelines/ # UI review
      SKILL.md
    micro-interactions/ # Button states, toggles
      SKILL.md
    doc-coauthoring/    # Documentation
      SKILL.md
  workflows/            # 10 AI-first YAML workflows
  bin/                  # Runtime scripts
    workflow-engine.py
    workflow-memory.py
    gh-issue-view.sh
    recall-context.sh
    snapshot.sh
    learn.sh
  state/                # Runtime state (gitignored)
  lessons_learned.md    # Active lessons
```
