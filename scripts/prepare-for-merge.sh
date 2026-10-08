#!/usr/bin/env bash
set -euo pipefail
# Native gate runner is centralized; this project entrypoint remains a pointer.
exec bash .agent/bin/native-prepare-gates.sh "$@"
