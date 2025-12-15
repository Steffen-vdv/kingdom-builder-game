#!/bin/bash

# Verify agent type before allowing access to agent-specific scripts
#
# Directory-based permission model:
#   - .claude/agents/hypervisor/scripts/* → Only hypervisor (marker != s_3k2)
#   - .claude/agents/sub-agent/scripts/*  → Only subagents (marker == s_3k2)
#   - .claude/agents/shared/scripts/*     → Both (if this directory exists)
#
# Security: Even if the hypervisor somehow gets crypto-gate, it still
# cannot call the signing or verification scripts because this hook blocks access.

COMMAND="${TOOL_INPUT_COMMAND:-}"
MARKER_FILE="$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"

# Read agent type from marker file
if [[ -f "$MARKER_FILE" ]]; then
  AGENT_TYPE=$(cat "$MARKER_FILE" 2>/dev/null)
else
  AGENT_TYPE=""
fi

# Check if calling subagent-specific scripts
if [[ "$COMMAND" == *".claude/agents/sub-agent/scripts/"* ]]; then
  # Only subagents can call these scripts (s_3k2 = subagent marker)
  if [[ "$AGENT_TYPE" != "s_3k2" ]]; then
    cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Script requires subagent context                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Scripts in .claude/agents/sub-agent/scripts/ can only be called by subagents
(code-reviewer, pusher).

The hypervisor must spawn the appropriate subagent to use these scripts.
BLOCKED
    exit 2
  fi
fi

# Check if calling hypervisor scripts from subagent context
if [[ "$COMMAND" == *".claude/agents/hypervisor/scripts/"* ]]; then
  # Only hypervisor can call these scripts
  if [[ "$AGENT_TYPE" == "s_3k2" ]]; then
    cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Script requires hypervisor context                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Scripts in .claude/agents/hypervisor/scripts/ can only be called by the hypervisor.

Subagents cannot access hypervisor scripts.
BLOCKED
    exit 2
  fi
fi

# Not a restricted script or agent type matches, allow execution
exit 0
