Start Vite dev server, monitor output for errors/warnings, and generate a deduplicated report.

Usage: /monitor-vite [duration_seconds] [port]
Defaults: 30 seconds, port 5173

Input: $ARGUMENTS

Follow the workflow defined in `.agent/workflows/monitor-vite.workflow.yaml`. Execute each phase:

## Phase 1: Pre-flight Checks
- Verify Node.js is available
- Install deps if `node_modules/` is missing: `npm ci --legacy-peer-deps`

## Phase 2: Setup Monitoring
- Create a temporary scratchpad directory for logs

## Phase 3: Launch & Capture Logs
- Run Vite dev server with a timeout: `timeout {duration}s npx vite --host 2>&1`
- Capture all output to a log file

## Phase 4: Extract Issues
- Grep for errors, warnings, exceptions, failures in the captured logs

## Phase 5: Deduplicate & Categorize
- Sort and deduplicate issues by frequency
- Categorize:
  - **FATAL**: build failures, module not found
  - **APP_ERROR**: runtime errors, hook violations
  - **STYLE**: tailwind warnings, deprecations
  - **CONFIG**: vite/plugin config issues

## Phase 6: Generate Report
Present a structured report with:
- Duration and total log lines captured
- Unique issues grouped by category
- Frequency count for each issue
- Severity classification

## Next Step
- If issues are found, suggest running `/handle-review-results` to resolve them
