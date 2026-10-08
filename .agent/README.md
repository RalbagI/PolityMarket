# .agent

Pointer-only AI Helpers shim for `polity_market`.

The canonical rules, workflows, skills, MCP profiles, and AI memory live in
`AI_Helpers`.

Files allowed here:

- `ai-helpers.yml`
- `README.md`
- `bin/` generated pointer wrappers for legacy project scripts
- local ignored runtime state, if needed

Run:

```bash
../AI_Helpers/bin/aih doctor --project-root .
../AI_Helpers/bin/aih sync --project-root .
```
