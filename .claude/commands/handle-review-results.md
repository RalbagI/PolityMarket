Resolve all findings from a previous `/code-review` or `/monitor-vite` run. Addresses MUST FIX, SHOULD FIX, and NICE TO HAVE items.

Usage: /handle-review-results

Follow the workflow defined in `.agent/workflows/handle-review-results.workflow.yaml`. Execute each phase:

## Phase 0: Recall Context
- Check `.agent/lessons_learned.md` for relevant prior lessons about resolving review findings

## Phase 1: Gather Findings
- Analyze the latest `/code-review` or `/monitor-vite` output from this conversation
- Extract and count all MUST FIX, SHOULD FIX, and NICE TO HAVE items

## Phase 2: Resolve Findings
- Address ALL MUST FIX items first (these are blockers)
- Address ALL SHOULD FIX items next
- Address NICE TO HAVE items where reasonable, justify skipping any
- After fixing, verify:
  - `npx eslint src/` passes
  - `npx vitest run` passes
  - `npx vitest run --coverage` shows adequate coverage

## Phase 3: Commit Resolutions
- Stage changed files
- Commit with message: `fix: resolve code review findings`

## Phase 4: Verify State
- Confirm `git status --porcelain` is empty (clean working tree)

## Phase 5: Capture Memory
- Note any lessons learned for `.agent/lessons_learned.md` if applicable

## Important Rules
- After completing, ALWAYS ask: "Would you like me to run `/prepare-for-merge` to push and create a PR?"
