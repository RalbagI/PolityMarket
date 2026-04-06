# PolityMarket - AI Agent Instructions

> **All rules, skills, and workflows are centralized in `.agent/`**
>
> This file points to the unified configuration.

## CRITICAL: Modification Rules

**If asked to modify rules, skills, workflows, or add new agent capabilities:**

1. **ALWAYS modify files in `.agent/`** - This file is just a pointer
2. **Skills** -> `.agent/skills/`
3. **Workflows** -> `.agent/workflows/`
4. **Rules** -> `.agent/RULES.md`
5. **Lessons** -> `.agent/lessons_learned.md`
6. **MCP** -> `.agent/config/mcp.json`

**DO NOT add content to this file** - keep it as a pointer only.

---

## Quick Reference

- **Full Rules**: [.agent/RULES.md](.agent/RULES.md)
- **Skills**: [.agent/skills/](.agent/skills/)
- **Workflows**: [.agent/workflows/](.agent/workflows/) (**Single source of truth**)
- **MCP Config**: [.agent/config/mcp.json](.agent/config/mcp.json)
- **Lessons Learned**: [.agent/lessons_learned.md](.agent/lessons_learned.md)

## Critical Rules (Summary)

1. **Stack**: React 19, Vite 8, Tailwind CSS 4, Zustand, Firebase
2. **Coverage**: Maintain test coverage for all code changes
3. **Skill**: MUST use `.agent/skills/politymarket-builder/SKILL.md` for ALL code changes
4. **MCP**: Use Firebase MCP for Firestore and Functions operations
5. **Lessons**: Check `.agent/lessons_learned.md` BEFORE implementing fixes
6. **CI Logs**: Use `gh run view` and `gh run view --log-failed` - never ask user for logs

## Agent Read List

Agents should read:

- `.agent/RULES.md` for complete rules
- `.agent/skills/politymarket-builder/SKILL.md` for the builder skill
- `.agent/workflows/` for workflow definitions
