End-to-end issue resolution workflow. Accepts a GitHub issue number or free-text task description.

Usage: /resolve-issue #42 or /resolve-issue task: add dark mode toggle

Input: $ARGUMENTS

Follow the workflow defined in `.agent/workflows/resolve-issue.workflow.yaml`. Execute each phase in order:

## Phase 0: Recall Context
- Check `.agent/lessons_learned.md` for relevant prior lessons
- Note any lessons that apply to the current issue/task

## Phase 1: Branch Setup
- Run `git status -sb` to verify clean state
- If on `main`, create a feature branch: `issue-{ID}-{slug}` from `origin/main`
- If already on a feature branch, stay on it

## Phase 2: Fetch Issue Details
- If a GitHub issue number was provided, fetch it: `gh issue view {NUMBER} --comments`
- Extract acceptance criteria and requirements
- If free-text task was provided, use that as the task description

## Phase 3: Implement Solution
- Analyze the issue/task requirements
- Implement the fix/feature with minimal, focused changes
- Run tests: `npx vitest run --coverage --reporter=verbose` — all must pass
- Run lint: `npx eslint src/` — must pass clean

## Phase 4: Commit Changes
- Stage relevant files (prefer specific files over `git add .`)
- Write a descriptive commit message referencing the issue if applicable

## Phase 5: Verify Final State
- Confirm `git status --porcelain` is empty (clean working tree)

## Phase 6: Capture Memory
- Note any lessons learned for `.agent/lessons_learned.md` if applicable

## Important Rules
- Do NOT push. Use `/prepare-for-merge` to finalize.
- After completing, ALWAYS ask: "Would you like me to run `/code-review` to validate the changes?"
