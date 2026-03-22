Fetch, analyze, and fix failing GitHub Actions CI jobs on the current branch.

Usage: /ci-failing

Follow the workflow defined in `.agent/workflows/ci-failing.workflow.yaml`. Execute each phase:

## Phase 1: Fetch Logs
- Find failed runs: `gh run list --branch $(git branch --show-current) --limit 5`
- Download logs from the most recent failed run using `gh run view {ID} --log-failed`

## Phase 2: Triage Failures
Categorize each failure:
- **transient**: timeout, network, runner failure — may just need a re-run
- **lint_failure**: eslint/prettier errors
- **test_failure**: vitest assertion errors
- **build_failure**: vite build errors
- **dependency**: npm install/audit failures

## Phase 3: Fix Issues
- Apply minimal, targeted fixes for each category
- Run `npx eslint src/ --fix` for lint issues
- Run `npx vitest run` to verify tests pass
- Run `npx vite build` to verify build succeeds
- Check coverage: `npx vitest run --coverage`

## Phase 4: Commit & Push
- Stage and commit with message: `fix(ci): resolve failing jobs`
- Push to remote

## Phase 5: Cleanup
- Remove any downloaded log files (`rm -rf ci-logs/`)
- Verify clean git state
