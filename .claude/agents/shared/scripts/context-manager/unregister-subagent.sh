#!/bin/bash
# Decrement subagent count and restore master-agent context if count hits 0
#
# Called by subagent-cleanup.sh (SubagentStop hook).
# Atomically decrements the subagent counter. When count goes to 0,
# switches context back to master-agent.
#
# Only acts on custom subagents: test-runner, code-reviewer, pusher.
# Other subagent types (Explore, general-purpose, etc.) are ignored.
#
# Usage: unregister-subagent.sh <subagent_type>

SUBAGENT_TYPE="${1:-}"

# Only act on our custom subagents
case "$SUBAGENT_TYPE" in
	test-runner|code-reviewer|pusher)
		# Continue with unregistration
		;;
	*)
		# Not a custom subagent, skip unregistration
		exit 0
		;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/state.sh"

# Ensure state exists
"$SCRIPT_DIR/init.sh" 2>/dev/null

# Atomic read-modify-write with exclusive lock
exec 200>"$LOCK_FILE"
flock -x 200

# Read current state
if [[ -f "$STATE_FILE" ]]; then
	CURRENT_COUNT=$(jq -r '.subagent_count // 0' "$STATE_FILE" 2>/dev/null)
	if [[ -z "$CURRENT_COUNT" || "$CURRENT_COUNT" == "null" ]]; then
		CURRENT_COUNT=0
	fi
else
	CURRENT_COUNT=0
fi

# Decrement count (floor at 0)
NEW_COUNT=$((CURRENT_COUNT - 1))
if [[ $NEW_COUNT -lt 0 ]]; then
	NEW_COUNT=0
fi

# Determine new context based on count
if [[ $NEW_COUNT -eq 0 ]]; then
	NEW_CONTEXT="$MASTER_AGENT_CONTEXT"
else
	NEW_CONTEXT="$SUBAGENT_CONTEXT"
fi

# Write updated state
cat > "$STATE_FILE" << EOF
{
  "context": "$NEW_CONTEXT",
  "subagent_count": $NEW_COUNT,
  "last_updated": "$(date -Iseconds)"
}
EOF

flock -u 200
