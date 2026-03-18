#!/bin/bash
# Shared: capture workflow lesson
# Usage: learn.sh <workflow-name> [--issue ID] [--topic TOPIC]
WORKFLOW="${1:?Usage: learn.sh <workflow-name> [--issue ID] [--topic TOPIC]}"
shift
python3 .agent/bin/workflow-memory.py learn --workflow "$WORKFLOW" "$@" --auto
