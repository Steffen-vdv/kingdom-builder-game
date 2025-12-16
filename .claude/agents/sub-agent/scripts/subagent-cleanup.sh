#!/usr/bin/env bash
# Unregister subagent when it completes
#
# Atomically decrements the subagent counter. Only when the counter
# reaches 0 (all parallel subagents have completed) will the context
# be restored to master-agent.

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
"$CTX_MGR/unregister-subagent.sh"
