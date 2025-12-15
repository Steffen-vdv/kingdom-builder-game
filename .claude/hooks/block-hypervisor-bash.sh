#!/bin/bash

# Block hypervisor from implementation Bash commands
# Allows only read-only commands (git status, ls, pwd, cat, etc.)
# Subagents are not restricted by this hook

MARKER_FILE="$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"
AGENT_TYPE=$(cat "$MARKER_FILE" 2>/dev/null)

# Only restrict hypervisor (m_7x9), not subagents
if [[ "$AGENT_TYPE" != "m_7x9" ]]; then
  exit 0
fi

# Parse command from tool input
JSON_INPUT=$(cat)
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Whitelist: read-only commands hypervisor MAY use
ALLOWED_PATTERNS=(
  "^git (status|log|diff|branch|show|rev-parse)"
  "^ls "
  "^ls$"
  "^pwd$"
  "^echo "
  "^cat "
)

for pattern in "${ALLOWED_PATTERNS[@]}"; do
  if [[ "$COMMAND" =~ $pattern ]]; then
    exit 0
  fi
done

# Block everything else
cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Hypervisor cannot execute implementation commands               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

As hypervisor, you orchestrate — you do not implement.

Delegate to appropriate subagent:
  • Code changes → coder
  • Running tests → test-runner
  • Pushing → pusher
  • Deep analysis → mastermind
  • Quick lookups → minimind

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
exit 2
