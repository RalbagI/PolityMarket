---
updated_at: "2026-03-18"
review_cycle_days: 90
---

# AI Documentation

Source of truth for AI agents working on PolityMarket.

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
