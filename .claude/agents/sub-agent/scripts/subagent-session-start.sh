#!/bin/bash

# Subagent setup hook for Kingdom Builder
# Registers subagent context and outputs protocol documentation
# Note: crypto-gate binary is downloaded by master-agent at session start

# Read stdin FIRST before cd (stdin may not survive cd in some shells)
HOOK_INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

# Extract agent_type from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

log_session "subagent:$AGENT_TYPE" "SubagentStart"

# Register subagent context (only for custom agents)
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-subagent.sh" "$AGENT_TYPE"

log_session "subagent:$AGENT_TYPE" "SubagentStart" "completed"

# Output protocol spec (injected into subagent context)
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

cat << 'PROTOCOL_HEADER'
=== Subagent Communication Protocol ===
Before completing your session, you MUST write your structured output to a JSON file.
Your chat output can be free-form narrative — only the JSON file matters for data exchange.
See the OUTPUT format section below for file path and schema.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
