#!/bin/bash

# Block hypervisor from Edit and Write tools entirely
# Subagents are not restricted by this hook

MARKER_FILE="$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"
AGENT_TYPE=$(cat "$MARKER_FILE" 2>/dev/null)

# Only restrict hypervisor (m_7x9), not subagents
if [[ "$AGENT_TYPE" != "m_7x9" ]]; then
  exit 0
fi

# Hypervisor cannot use Edit or Write tools AT ALL
cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Hypervisor cannot edit or write files                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

As hypervisor, you orchestrate — you do not implement.

Delegate file modifications to the coder subagent.

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
exit 2
