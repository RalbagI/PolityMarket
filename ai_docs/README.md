---
updated_at: "2026-04-05"
review_cycle_days: 90
---

# AI Documentation

Source of truth for AI agents working on PolityMarket.

If you want the plain-language explanation first, start with:

- [`../README.md`](../README.md)
- [`architecture/ARCH.md`](architecture/ARCH.md) → see the "Plain-English summary"

## Structure

| Directory | Purpose |
|---|---|
| `architecture/` | System design, data flow, component relationships |
| `implementation/` | Patterns, conventions, common pitfalls |
| `ops/` | Deployment, CI/CD, monitoring, Firebase |

## Standards

- Every file has YAML frontmatter with `updated_at` and `review_cycle_days`
- Concise: agents read this, no fluff
- Machine readable: tables and lists over paragraphs
- Linked: use relative links between docs
