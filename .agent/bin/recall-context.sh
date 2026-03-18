#!/bin/bash
# Shared: recall workflow memory context
# Usage: recall-context.sh <workflow-name> [--issue ID] [--topic TOPIC]
WORKFLOW="${1:?Usage: recall-context.sh <workflow-name> [--issue ID] [--topic TOPIC]}"
shift
python3 .agent/bin/workflow-memory.py recall --workflow "$WORKFLOW" "$@" --limit 8
