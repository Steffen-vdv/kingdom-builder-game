#!/bin/bash
# State file location and constants for agent context management
#
# This file defines the shared state location used by all context-manager
# scripts. The state uses JSON format for atomic read/write with jq.
#
# Security model:
#   - Context is stored in XDG_RUNTIME_DIR (memory-backed, user-private)
#   - Fallback to /tmp for systems without XDG_RUNTIME_DIR
#   - flock ensures atomic access when multiple subagents run in parallel

STATE_DIR="${XDG_RUNTIME_DIR:-/tmp}/claude/context-manager"
STATE_FILE="$STATE_DIR/state.json"
LOCK_FILE="$STATE_DIR/.lock"

# Human-readable context values
MASTER_AGENT_CONTEXT="master-agent"
SUBAGENT_CONTEXT="subagent"
