Audit project structure, instruction files, and workflow health for context-friction signals. This is READ-ONLY — generates a report only.

Usage: /context-health

Follow the workflow defined in `.agent/workflows/context-health.workflow.yaml`.

## Phase 1: Run Context Audit
- Verify `.agent/` directory exists
- Count workflow files in `.agent/workflows/`
- Count source files in `src/`
- Check data pipeline directory
- List config files (package.json, vite.config.js, eslint config, etc.)
- Check `.agent/lessons_learned.md` status and line count
- Check workflow memory state in `.agent/state/workflow_memory.jsonl`

## Phase 2: Report Summary
Generate a structured report with:
- **Scope**: workflow count, source file count, config file coverage
- **Findings**: any missing or stale config, gaps in workflow coverage, outdated lessons
- **Recommendations**: suggested fixes for any context friction found

## Important Rules
- This is READ-ONLY. Do NOT modify any files.
- Report findings with clear severity: critical, warning, info
