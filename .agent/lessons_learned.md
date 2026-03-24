---
updated_at: "2026-03-18"
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
