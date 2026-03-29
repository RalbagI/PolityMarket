# Test Architecture (2026 Pyramid)

This repository follows a Shift-Left test strategy with explicit suite boundaries:

- `tests/unit/**` + existing logic tests in `src/lib/**` and `data-pipeline/**`: fast deterministic checks (~70%).
- `tests/component/**` + existing UI behavior tests in `src/components/**`: user-facing behavior checks (part of ~20%).
- `tests/integration/**`: API/contract + cross-module integration checks (part of ~20%, together with component).
- `tests/e2e/**`: Playwright critical-path checks only (~10%).

## Isolated test environment

All suite scripts load `.env.test` via Node's `--env-file` flag. Avoid relying on `.env.production` or `.env.pipeline` from tests.

## Ephemeral test data pattern

For integration tests:

- Mock external HTTP dependencies with `msw` in `tests/integration/setup/msw-server.js`.
- Provide fixture payloads per test case (`server.use(...)`) so data is isolated and cannot leak between tests.
- Validate payload contracts with `zod` before asserting behavior.

## Commands

- `npm run test:unit`
- `npm run test:component`
- `npm run test:integration`
- `npm run playwright:install` (one-time, local)
- `npm run test:e2e`
