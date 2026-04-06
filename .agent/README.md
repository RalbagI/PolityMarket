# PolityMarket AI Agent System

> Single source of truth for all AI agent configuration.
> All tool-specific folders (`.claude/`) reference back here.

## Architecture

```
.agent/
  RULES.md              <- Master rules (all agents read this)
  README.md             <- This file
  config/
    mcp.json            <- MCP server config (synced to .claude/mcp.json)
    workflow-schema.yaml <- Workflow YAML format spec (v1.1)
  skills/
    politymarket-builder/ <- MANDATORY for all code changes
    security/           <- Web security, Cloud Functions, Firestore rules
    node-security-audit/ <- npm dependency security
    interaction-design/ <- UI motion + Tailwind CSS 4 animations
    web-design-guidelines/ <- UI review + accessibility
    micro-interactions/ <- Button states, toggles
    doc-coauthoring/    <- Documentation standards
  workflows/            <- 10 AI-first YAML workflows
  bin/
    workflow-engine.py  <- YAML workflow executor
    workflow-memory.py  <- Recall, snapshot, learn, gc, circuit breaker
    gh-issue-view.sh    <- GitHub issue fetcher
    recall-context.sh   <- Memory recall wrapper
    snapshot.sh         <- Snapshot capture wrapper
    learn.sh            <- Lessons learning wrapper
  state/                <- Runtime state (gitignored)
    workflow_memory.jsonl
    workflow_snapshots.jsonl
    handoff_*.json      <- Structured handoff data between workflows
  lessons_learned.md    <- Active high-signal lessons
```

## Workflow Chain

```
/resolve-issue -> /code-review -> /handle-review-results -> /prepare-for-merge -> /mts
```

Each workflow writes structured handoff JSON to `.agent/state/` for the next workflow.

## Key Features (v1.1)

- **Structured Handoffs**: Workflows pass typed data via JSON files in `.agent/state/`
- **Circuit Breakers**: Auto-triggered workflows (ci-failing, mts) have loop detection
- **Multi-Model Routing**: `tier:` field on steps (high/medium/low) maps to models via `config/model-routing.yaml`
- **Memory System**: recall/snapshot/learn/gc primitives with fingerprinting

## Quick Start

1. Read `RULES.md` for all mandatory rules
2. Read `skills/politymarket-builder/SKILL.md` for code change guidance
3. Use `/resolve-issue` to start working on an issue
4. Follow the workflow chain to merge and deploy
