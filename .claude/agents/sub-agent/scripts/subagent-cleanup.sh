#!/usr/bin/env bash
# Unregister subagent when it completes
#
# Atomically decrements the subagent counter. Only when the counter
# reaches 0 (all parallel subagents have completed) will the context
# be restored to hypervisor. This fixes the race condition where the
# first completing subagent would prematurely restore hypervisor context.

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
"$CTX_MGR/unregister-subagent.sh"
