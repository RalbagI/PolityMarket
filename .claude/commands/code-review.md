Security-first code review workflow. Evaluates branch delta from origin/main plus any local uncommitted changes. This is a READ-ONLY workflow — do not modify any files.

Usage: /code-review

Follow the workflow defined in `.agent/workflows/code-review.workflow.yaml`. Execute each phase:

## Phase 0: Recall Context
- Check `.agent/lessons_learned.md` for relevant prior lessons about code review findings

## Phase 1: Scope Detection
- Detect uncommitted changes: `git diff --name-only --cached`, `git diff --name-only`, `git ls-files --others --exclude-standard`
- Check if a PR exists: `gh pr view 2>/dev/null`
- Determine review mode: QUICK (uncommitted only), FULL (PR only), BOTH, or NONE

## Phase 2: Static Analysis (run in parallel)
- ESLint: `npx eslint src/` — MUST pass
- Prettier: `npx prettier --check "src/**/*.{js,jsx,ts,tsx,css,json}"`
- Secrets scan: search for `api_key`, `secret`, `password`, `token` assignments in src/
- Debug console.log scan: find leftover console statements in src/

## Phase 3: Security Checks (run in parallel)
- `npm audit --omit=dev --audit-level=high`
- Check no `.env` or credential files are tracked in git
- Review changed code for XSS, injection, unsafe HTML patterns

## Phase 4: Project-Specific Checks
- Build check: `npx vite build`
- File size check: flag any changed source files in src/ over 400 lines

## Phase 5: Deep Code Review
- Collect all changes: committed vs origin/main, staged, unstaged, untracked
- Review for: issue handling, UI/UX, testing quality, performance
- Review for: patterns, antipatterns, tech debt, React hooks correctness

## Phase 6: Report
Categorize all findings into:
- **MUST FIX**: security issues, crashes, blockers
- **SHOULD FIX**: quality, performance, accessibility issues
- **NICE TO HAVE**: style, naming, minor optimizations

## Important Rules
- This is READ-ONLY. Do NOT modify any files.
- After completing, ALWAYS ask: "Would you like me to run `/handle-review-results` to resolve the findings?"
