Get up to speed on the current branch context, changes, and status. Optional topic argument narrows focus.

Usage: /get-up-to-speed [topic]

Input: $ARGUMENTS

Follow the workflow defined in `.agent/workflows/get-up-to-speed.workflow.yaml`. This is READ-ONLY — do not modify files.

## Phase 0: Recall Context
- Check `.agent/lessons_learned.md` for relevant prior lessons

## Phase 1: Branch Metadata
- Current branch: `git rev-parse --abbrev-ref HEAD`
- Extract issue ID from branch name if present (e.g., `issue-42-fix-bug` → #42)
- Show recent commits: `git log --oneline --graph --decorate -10`

## Phase 2: Issue Details
- If an issue ID was found, fetch it: `gh issue view {ID} --comments`
- If a topic argument was provided, search for related code in `src/` and `data-pipeline/`

## Phase 3: Code Changes
- Show diff stats vs origin/main: `git diff origin/main --stat`
- List changed files: `git diff origin/main --name-only`
- If a topic was provided, prioritize files matching that topic

## Output
Provide a structured summary:
- Branch name and linked issue
- Recent commit history
- Issue description/requirements
- Changed files and scope of changes
- If topic was provided, focus the summary on that topic
