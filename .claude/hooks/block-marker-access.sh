#!/bin/bash

# Block direct manipulation of the agent context state files
# Context can only be managed by the context-manager scripts, which are
# called by setup hooks (mss.sh, msh.sh, sss.sh, subagent-cleanup.sh)
#
# Security: Prevents agents from faking their identity by
# manipulating context state directly.

COMMAND="${TOOL_INPUT_COMMAND:-}"

# Block any command that references the context manager state directory
# Patterns to block:
#   - Direct path to state directory
#   - The state.json file
#   - The .lock file
#   - Legacy marker file (in case it still exists)
BLOCKED_PATTERNS=(
	"claude/context-manager/state.json"
	"claude/context-manager/.lock"
	".__ctx_9f8e7d__"
	".claude/tests/context-manager.test.sh"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
	if [[ "$COMMAND" == *"$pattern"* ]]; then
		cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Protected system file                                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

This file is part of the security infrastructure and cannot be accessed directly.
Context is managed exclusively by the context-manager scripts.
BLOCKED
		exit 2
	fi
done

# Not accessing protected files, allow execution
exit 0
