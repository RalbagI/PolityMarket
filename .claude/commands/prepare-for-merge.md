Single-pass prepare-for-merge workflow. Runs all checks, syncs with main, pushes, and creates/updates a PR.

Usage: /prepare-for-merge

Follow the workflow defined in `.agent/workflows/prepare-for-merge.workflow.yaml`. Execute each phase:

## Phase 0: Recall Context
- Check `.agent/lessons_learned.md` for relevant prior lessons

## Phase 1: Pre-flight Checks
- Verify NOT on main branch (exit if on main)
- Sync with main: `git fetch origin main` then `git rebase origin/main`
  - If rebase conflicts arise, resolve them (read conflicting files, choose correct content, `git add`, `git rebase --continue`)
  - After rebase, force-push with `--force-with-lease` since history was rewritten
- Install deps: `npm ci --legacy-peer-deps`

## Phase 2: Validate (run in parallel where possible)
- ESLint: `npx eslint src/` — MUST pass
- Prettier: `npx prettier --check "src/**/*.{js,jsx,ts,tsx,css,json}"`
- Tests: `npx vitest run` — MUST pass
- Coverage: `npx vitest run --coverage`
- Build: `npx vite build` — MUST pass

## Phase 3: Push & PR
- Push: `git push --force-with-lease -u origin $(git rev-parse --abbrev-ref HEAD)`
- Gather context: commits since origin/main, diff stat
- Create or update PR via `gh pr create` with a rich description generated from commits and diff

## Phase 4: Self-Improvement
- If any auto-fixes were applied (format, lint, coverage), record a lesson in `.agent/lessons_learned.md`
- Commit and push lessons if updated

## Phase 5: Final Verification
- Confirm clean git state

## Important Rules
- After completing, ALWAYS ask: "Would you like me to run `/mts` to merge, cleanup, and deploy?"
