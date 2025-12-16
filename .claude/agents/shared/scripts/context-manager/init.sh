#!/bin/bash
# Initialize context manager state directory and files
#
# Creates the state directory and initial state.json if they don't exist.
# Safe to call multiple times (idempotent).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/state.sh"

# Create state directory if needed
if [[ ! -d "$STATE_DIR" ]]; then
	mkdir -p "$STATE_DIR"
	chmod 700 "$STATE_DIR"
fi

# Create lock file if needed
if [[ ! -f "$LOCK_FILE" ]]; then
	touch "$LOCK_FILE"
fi

# Create initial state if needed
if [[ ! -f "$STATE_FILE" ]]; then
	cat > "$STATE_FILE" << EOF
{
  "context": "$HYPERVISOR_CONTEXT",
  "subagent_count": 0,
  "last_updated": "$(date -Iseconds)"
}
EOF
fi
