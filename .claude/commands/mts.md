Merge This Shit — final-stage workflow. Verifies CI, merges current PR, cleans up, pulls main, deploys Firebase.

Usage: /mts

Follow the workflow defined in `.agent/workflows/mts.workflow.yaml`. Execute each phase in order:

## Phase 1: Verify CI
- Get current branch and find its open PR: `gh pr list --head $(git rev-parse --abbrev-ref HEAD) --json number --jq '.[0].number'`
- Run `gh pr checks {PR_NUMBER}` — if ANY check is not "pass", **STOP immediately** and report which checks failed. Do NOT proceed to merge.

## Phase 2: Merge PR
- Run `gh pr merge {PR_NUMBER} --squash --delete-branch`
- Verify merge: `gh pr view {PR_NUMBER} --json state,mergedAt`

## Phase 3: Cleanup & Pull
- `git checkout main`
- `git remote prune origin`
- `git pull origin main`
- Verify: `git status -sb` shows clean `## main...origin/main`
- Verify: `git branch -a` shows only `main` + `remotes/origin/main`

## Phase 4: Deploy Firebase
- `npx vite build`
- `npx firebase deploy --only hosting`

## Output
Report a summary table at the end:

| Step | Status |
|------|--------|
| CI | all checks passed |
| Merge | PR #{number} merged at {time} |
| Branch | deleted, only main remains |
| Pull | up to date |
| Firebase | deployed at {url} |

## Important Rules
- If CI fails in Phase 1, STOP. Do not merge.
- This is the LAST step in the workflow chain: resolve-issue → code-review → handle-review-results → prepare-for-merge → **mts**
