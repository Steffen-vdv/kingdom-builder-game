#!/bin/bash

# Verify agent type before allowing access to subagent-specific scripts
# Main agents cannot call scripts in subagent/
#
# Security: Even if a main agent somehow gets crypto-gate, it still
# cannot call the signing or verification scripts because this hook blocks access.

COMMAND="${TOOL_INPUT_COMMAND:-}"
MARKER_FILE="$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"

# Check if calling scripts in subagent-only directory
if [[ "$COMMAND" == *"scripts/subagent/"* ]]; then

  # Read the marker file
  if [[ -f "$MARKER_FILE" ]]; then
    AGENT_TYPE=$(cat "$MARKER_FILE" 2>/dev/null)
  else
    AGENT_TYPE=""
  fi

  # Only subagents can call these scripts (s_3k2 = subagent marker)
  if [[ "$AGENT_TYPE" != "s_3k2" ]]; then
    cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Script requires subagent context                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Scripts in subagent/ directory can only be called by subagents
(code-reviewer, pusher).

Main task agents must spawn the appropriate subagent to use these scripts.
BLOCKED
    exit 2
  fi
fi

# Not a restricted script or agent type matches, allow execution
exit 0
