#!/bin/bash
# Increment subagent count and switch context if needed
#
# Called by sss.sh (SubagentStart hook).
# Atomically increments the subagent counter. When count goes from 0 to 1,
# switches context from master-agent to subagent.
#
# Only acts on custom subagents: test-runner, 6 QA reviewers, pusher.
# Other subagent types (Explore, general-purpose, etc.) are ignored.
#
# Usage: register-subagent.sh <subagent_type>

SUBAGENT_TYPE="${1:-}"

# Only act on our custom subagents
case "$SUBAGENT_TYPE" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry|review-lead|safe-deployment-gate)
		# Continue with registration
		;;
	*)
		# Not a custom subagent, skip registration
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

# Increment count
NEW_COUNT=$((CURRENT_COUNT + 1))

# Write updated state (always subagent context when count > 0)
cat > "$STATE_FILE" << EOF
{
  "context": "$SUBAGENT_CONTEXT",
  "subagent_count": $NEW_COUNT,
  "last_updated": "$(date -Iseconds)"
}
EOF

flock -u 200
