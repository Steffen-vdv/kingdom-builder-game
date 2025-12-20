#!/usr/bin/env bash
# Unregister subagent when it completes
#
# Atomically decrements the subagent counter. Only when the counter
# reaches 0 (all parallel subagents have completed) will the context
# be restored to master-agent.
#
# Only acts on custom subagents (6 Phase 1 reviewers, review-lead, safe-deployment-gate).

# Read stdin FIRST before cd (stdin may not survive cd in some shells)
HOOK_INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

# =============================================================================
# DEBUG: Log full hook input structure to understand available fields
# =============================================================================
log_hook "SubagentStop" "=== HOOK INPUT STRUCTURE DEBUG ==="
log_hook "SubagentStop" "Raw input length: ${#HOOK_INPUT} bytes"

# Log top-level keys
TOP_KEYS=$(echo "$HOOK_INPUT" | jq -r 'keys | join(", ")' 2>/dev/null || echo "jq_parse_failed")
log_hook "SubagentStop" "Top-level keys: $TOP_KEYS"

# Log agent_type field specifically
AGENT_TYPE_RAW=$(echo "$HOOK_INPUT" | jq -r '.agent_type // "MISSING"' 2>/dev/null)
log_hook "SubagentStop" "agent_type value: $AGENT_TYPE_RAW"

# Log tool_response structure if present (this would contain subagent output)
HAS_RESPONSE=$(echo "$HOOK_INPUT" | jq -r 'has("tool_response")' 2>/dev/null || echo "false")
log_hook "SubagentStop" "has tool_response: $HAS_RESPONSE"

if [[ "$HAS_RESPONSE" == "true" ]]; then
	RESPONSE_KEYS=$(echo "$HOOK_INPUT" | jq -r '.tool_response | keys | join(", ")' 2>/dev/null || echo "none")
	log_hook "SubagentStop" "tool_response keys: $RESPONSE_KEYS"

	# Check for content array (where subagent response text would be)
	CONTENT_LENGTH=$(echo "$HOOK_INPUT" | jq -r '.tool_response.content | length' 2>/dev/null || echo "0")
	log_hook "SubagentStop" "tool_response.content length: $CONTENT_LENGTH"
fi

# Log first 500 chars of raw input for inspection
TRUNCATED=$(echo "$HOOK_INPUT" | head -c 500)
log_hook "SubagentStop" "First 500 chars: $TRUNCATED"

log_hook "SubagentStop" "=== END DEBUG ==="

# Extract agent_type from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

log_session "subagent:$AGENT_TYPE" "SubagentStop"

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
"$CTX_MGR/unregister-subagent.sh" "$AGENT_TYPE"

log_session "subagent:$AGENT_TYPE" "SubagentStop" "completed"
