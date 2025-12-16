#!/bin/bash

# Verify agent type before allowing access to agent-specific scripts
#
# Directory-based permission model:
#   - .claude/agents/hypervisor/scripts/* → Only hypervisor (context=hypervisor)
#   - .claude/agents/sub-agent/scripts/*  → Only subagents (context=subagent)
#   - .claude/agents/shared/scripts/*     → Both (always allowed)
#
# Security: Even if the hypervisor somehow gets crypto-gate, it still
# cannot call the signing or verification scripts because this hook blocks access.

COMMAND="${TOOL_INPUT_COMMAND:-}"

# Get context from the atomic context manager
CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
CONTEXT=$("$CTX_MGR/get-context.sh" 2>/dev/null)

# Default to hypervisor if context manager not available
if [[ -z "$CONTEXT" ]]; then
	CONTEXT="hypervisor"
fi

# Check if calling subagent-specific scripts
if [[ "$COMMAND" == *".claude/agents/sub-agent/scripts/"* ]]; then
	# Only subagents can call these scripts
	if [[ "$CONTEXT" != "subagent" ]]; then
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
	if [[ "$CONTEXT" == "subagent" ]]; then
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
