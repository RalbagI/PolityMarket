#!/bin/bash
# Shared: take workflow snapshot
# Usage: snapshot.sh <workflow-name> <phase> [--issue ID] [--note NOTE]
WORKFLOW="${1:?Usage: snapshot.sh <workflow-name> <phase>}"
PHASE="${2:?Usage: snapshot.sh <workflow-name> <phase>}"
shift 2
python3 .agent/bin/workflow-memory.py snapshot --workflow "$WORKFLOW" --phase "$PHASE" "$@"
