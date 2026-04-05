---
updated_at: "2026-04-05"
review_cycle_days: 365
---

# Lessons Learned

This file keeps only active, high-signal lessons.
New entries appended by /prepare-for-merge and /resolve-issue workflows.

## Active Lessons

### NPM peer dependency conflicts (2026-03-17)

- **Lesson**: Use `--legacy-peer-deps` when installing npm packages due to Vite 8 / Tailwind CSS peer dependency conflict.
- **Pattern**: Always include `--legacy-peer-deps` in `npm ci` and `npm install` commands.
- **Prevention**: CI workflow uses `npm ci --legacy-peer-deps --prefer-offline`.

### Tailwind CSS v4 import syntax (2026-03-17)

- **Lesson**: Tailwind CSS v4 uses `@import "tailwindcss"` instead of `@tailwind` directives.
- **Pattern**: Check Tailwind version before writing CSS imports.

### d3-scale returns rgb() not hex (2026-03-18)

- **Lesson**: `d3-scale` scaleLinear with color ranges returns `rgb(r, g, b)` strings, not hex. `scoreToColorWithAlpha` must parse rgb() format.
- **Pattern**: Always handle both `rgb()` and `#hex` when parsing d3 color output.
- **Prevention**: Test color utilities with actual d3 output.

### RTL margin direction (2026-03-18)

- **Lesson**: In RTL layout, `margin-inline-start` = `margin-right`. Sidebar on right (via `inset-inline-start-0`) needs `ms-[260px]` not `me-[260px]` on main content.
- **Pattern**: For RTL, sidebar position → `inset-inline-start`, content offset → `margin-inline-start`.
- **Prevention**: Test with `dir="rtl"` during development.

### Tailwind v4 compound variants (2026-03-18)

- **Lesson**: `sm:ltr:` and `sm:rtl:` compound variants don't work in Tailwind v4. Use CSS classes with `[dir="rtl"]` selector instead.
- **Pattern**: For RTL-specific transforms, use custom CSS classes not Tailwind compound variants.
- **Prevention**: Defined `.slide-panel-hidden` with `[dir="rtl"]` in index.css.

### useCallback with state dependencies (2026-03-18)

- **Lesson**: `useCallback` depending on state (like `detailCache`) causes infinite re-renders. Use functional setState or refs instead.
- **Pattern**: Use `useStore.getState()` or `useRef` inside callbacks to read current state without adding dependencies.

### Zod strips extra fields (2026-03-18)

- **Lesson**: Zod `safeParse` strips fields not in the schema by default. LLM hallucinated fields (like `overall_score` when not expected) are automatically removed.
- **Pattern**: Use `safeParse` not `parse` for field-level error messages without throwing.

### Coverage check is a critical quality gate (2026-03-18)

- **Lesson**: Tipi enforces 100% diff coverage across 4 workflows. PolityMarket initially missed this entirely, losing a critical quality gate.
- **Pattern**: Every workflow that modifies code must verify coverage: `npx vitest run --coverage`.
- **Prevention**: Added coverage steps to resolve-issue, handle-review-results, ci-failing, prepare-for-merge.

### Promise.allSettled never throws — test partial failures, not null (2026-03-24)

- **Lesson**: OpenKnesset client uses `Promise.allSettled` to absorb individual endpoint failures. When endpoints fail, the function returns a partial struct (with null fields), NOT null overall. Only returns null when the politician has no memberIdMap entry.
- **Pattern**: When testing resilient clients that use `Promise.allSettled`, assert the shape of partial results — not `toBeNull()`.
- **Prevention**: Read the implementation before writing "graceful failure" test expectations.

### Zod default import removal when switching formulas (2026-03-24)

- **Lesson**: When replacing a default export with a named export (`computeOverallScore` → `computeOverallScore8dim`), the old default import in consumers becomes unused and triggers `no-unused-vars`. Remove it explicitly.
- **Pattern**: After formula switches, grep for the old default import name across all consumers.

### Codex CLI model availability (2026-03-24)

- **Lesson**: Codex CLI on ChatGPT accounts only supports `gpt-5.*` models (gpt-5.4, gpt-5.4-mini, etc.). Standard OpenAI API models like `gpt-4o-mini`, `gpt-4.5`, `o4-mini` all fail with "model not supported". Check `~/.codex/models_cache.json` for available slugs.
- **Pattern**: Always verify model availability with a minimal test call before hardcoding model names.
- **Prevention**: Use configurable env vars (OPENAI_MODEL_HIGH, OPENAI_MODEL_LOW) with safe defaults.

### Nullable chain_of_thought across all schemas (2026-03-24)

- **Lesson**: When introducing `[COT: skip]` for low-tier LLM calls, `chain_of_thought: null` must be accepted by ALL Zod schemas in the pipeline — not just the LLM response schema, but also dailyEntrySchema and llmResponseSchema. The same field flows through multiple validation layers.
- **Pattern**: When making a field nullable, grep for ALL `.string().min(1)` references to that field name across parseLLMResponse.js.
- **Prevention**: Search `chain_of_thought:` across all Zod schemas before assuming a single change is sufficient.

### Codex CLI reasoning effort inherited from global config (2026-03-24)

- **Lesson**: The global `model_reasoning_effort = "xhigh"` in `~/.codex/config.toml` applies to ALL codex exec calls unless overridden with `-c model_reasoning_effort="low"`. A 127-politician batch with xhigh reasoning on gpt-5.4-mini will timeout at 5 minutes.
- **Pattern**: Always override reasoning effort per-tier via `-c model_reasoning_effort=` flag.
- **Prevention**: Set MAX_BATCH_SIZE to 50 (not 135) and OPENAI_TIMEOUT_MS to 600000 (10 min).

### Webhook SSRF prevention in Cloud Functions (2026-03-30)

- **Lesson**: User-supplied webhook URLs stored in Firestore and dispatched by Cloud Functions must be validated to prevent SSRF. Block private IP ranges, metadata endpoints, and require HTTPS.
- **Pattern**: Validate URL protocol (HTTPS only), reject `localhost`, `169.254.*`, `10.*`, `172.16-31.*`, `192.168.*`, `metadata.google.internal`, and `.internal` domains.
- **Prevention**: Add `isValidWebhookUrl()` validation in Cloud Functions before storing webhook URLs.

### Subscription update auth (2026-03-30)

- **Lesson**: Email-as-identifier subscription systems must require the subscription token for updates, not just email match. Otherwise anyone who knows an email can modify another user's subscription.
- **Pattern**: Require `token` in update requests, not just email lookup.

### Always format changed files before committing (2026-04-04)

- **Lesson**: Prettier warnings on changed files cause extra amend cycles. Always run `npx prettier --write` on changed files before the first commit.
- **Pattern**: After editing, format with Prettier before staging.
- **Prevention**: Add prettier --write step before `git add` in prepare-for-merge workflow.

### Extracted component files still need explicit Prettier pass (2026-04-05)

- **Lesson**: When splitting a large component into a new file, the new file is easy to miss in the final format pass even if the parent file was already clean.
- **Pattern**: After extraction/refactor work, run Prettier on every newly created file before validation.
- **Prevention**: Compare `git diff --name-only` against the Prettier target set before pushing.

### RLM marks cause /r corruption in RTL Hebrew text (2026-04-05)

- **Lesson**: Inserting Unicode RLM (Right-to-Left Mark, U+200E) around LTR text (like "Reddit (r/Israel)") in RTL Hebrew context causes display corruption. The `/r` appears garbled/duplicated in the UI.
- **Pattern**: Let natural RTL handling (via `dir="rtl"` on HTML) display mixed LTR/RTL text. Don't add RLM marks as a workaround.
- **Prevention**: Test Hebrew methodology page by viewing Reddit subreddit names on production. If `/r` displays corrupted, remove the RLM marks, not add more.
