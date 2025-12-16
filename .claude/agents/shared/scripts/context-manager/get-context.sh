#!/bin/bash
# Read current context (outputs "master-agent" or "subagent")
#
# Uses flock for atomic read to prevent race conditions when
# multiple subagents are running in parallel.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/state.sh"

# Ensure state exists
"$SCRIPT_DIR/init.sh" 2>/dev/null

# Atomic read with shared lock
exec 200>"$LOCK_FILE"
flock -s 200

# Read context from state file
if [[ -f "$STATE_FILE" ]]; then
	CONTEXT=$(jq -r '.context // "master-agent"' "$STATE_FILE" 2>/dev/null)
	if [[ -z "$CONTEXT" || "$CONTEXT" == "null" ]]; then
		CONTEXT="$MASTER_AGENT_CONTEXT"
	fi
else
	CONTEXT="$MASTER_AGENT_CONTEXT"
fi

flock -u 200

echo "$CONTEXT"
