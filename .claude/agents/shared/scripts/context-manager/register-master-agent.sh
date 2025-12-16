#!/bin/bash
# Set context to master-agent and reset subagent count to 0
#
# Called by mss.sh (session start) and msh.sh (session handover).
# Atomically resets the context to master-agent mode.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/state.sh"

# Ensure state exists
"$SCRIPT_DIR/init.sh" 2>/dev/null

# Atomic write with exclusive lock
exec 200>"$LOCK_FILE"
flock -x 200

# Write master-agent state
cat > "$STATE_FILE" << EOF
{
  "context": "$MASTER_AGENT_CONTEXT",
  "subagent_count": 0,
  "last_updated": "$(date -Iseconds)"
}
EOF

flock -u 200
