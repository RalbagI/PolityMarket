Sync origin/main into the current feature branch, resolving any conflicts.

Usage: /sync-main

Follow the workflow defined in `.agent/workflows/sync-main.workflow.yaml`. Execute each phase:

## Phase 1: Verify State
- Run `git status -sb` to verify working tree is clean
- Fetch latest main: `git fetch origin main`

## Phase 2: Merge Main
- Merge: `git merge origin/main --no-edit`
- If merge succeeds cleanly, proceed to verification

## Phase 3: Resolve Conflicts (if any)
- Identify conflicts: `git status --short | grep '^UU'`
- For each conflicted file, examine conflict markers and resolve intelligently
- After resolving, run `npx vitest run` to verify tests pass

## Phase 4: Commit Merge
- Stage resolved files
- Commit: `chore: sync main into branch`

## Phase 5: Final Verification
- Confirm clean git state

## Important Rules
- Do NOT push. Use `/prepare-for-merge` to finalize.
