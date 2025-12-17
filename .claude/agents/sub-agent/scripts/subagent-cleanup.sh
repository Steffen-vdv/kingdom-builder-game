#!/usr/bin/env bash
# Unregister subagent when it completes
#
# Atomically decrements the subagent counter. Only when the counter
# reaches 0 (all parallel subagents have completed) will the context
# be restored to master-agent.
#
# Only acts on custom subagents (6 Phase 1 reviewers, review-lead, safe-deployment-gate).

# Read stdin to get hook input (contains agent_type)
HOOK_INPUT=$(cat)

# Extract agent_type from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
"$CTX_MGR/unregister-subagent.sh" "$AGENT_TYPE"
