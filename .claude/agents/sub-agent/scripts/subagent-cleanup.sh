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

# Extract agent_type from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

log_session "subagent:$AGENT_TYPE" "SubagentStop"

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
"$CTX_MGR/unregister-subagent.sh" "$AGENT_TYPE"

log_session "subagent:$AGENT_TYPE" "SubagentStop" "completed"
