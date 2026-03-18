---
updated_at: "2026-01-25"
review_cycle_days: 365
name: doc-coauthoring
description: Standards for co-authoring documentation in the ai_docs/ structure.
---

# Doc Co-authoring Skill

Maintains the `ai_docs/` knowledge base with strict structure and metadata.

## Structure

- **Path**: `ai_docs/` (Source of Truth).
- **Format**: Markdown with YAML frontmatter.

## Frontmatter Requirements

Every file in `ai_docs/` MUST have:

```yaml
---
updated_at: "YYYY-MM-DD"
review_cycle_days: 90
scope: [System/Component Scope]
---
```

## Content Standards

1. **Concise**: Agents read this. No fluff.
2. **Linked**: Use relative links to other docs `[Link](../other/doc.md)`.
3. **Machine Readable**: Use tables and lists over paragraphs where possible.

## Workflow

- **Updates**: When changing code patterns, update relevant `ai_docs`.
- **Review**: Check `updated_at` + `review_cycle_days`. If expired, trigger review.
