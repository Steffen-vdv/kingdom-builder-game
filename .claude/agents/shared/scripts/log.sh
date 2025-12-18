#!/bin/bash
# Centralized logging for Claude hooks
#
# Usage:
#   source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"
#   log_hook "tag" "message"
#
# Uses flock for atomic writes when multiple hooks run in parallel.

LOG_FILE="${LOG_FILE:-/tmp/claude/hooks/central.log}"
LOG_LOCK="${LOG_LOCK:-/tmp/claude/hooks/.central.log.lock}"

# Atomic log function using flock
# Usage: log_hook <tag> <message>
log_hook() {
	local tag="$1"
	local msg="$2"
	local timestamp
	timestamp=$(date -Iseconds)
	# Ensure directory exists (inside function for robustness)
	mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
	(
		flock -x 200
		echo "[$tag] $timestamp $msg" >> "$LOG_FILE"
	) 200>"$LOG_LOCK"
}

# Log session boundary (=== markers)
# Usage: log_session <tag> <event> [status]
# Example: log_session "start" "SessionStart" or log_session "start" "SessionStart" "completed"
log_session() {
	local tag="$1"
	local event="$2"
	local status="${3:-}"
	local timestamp
	timestamp=$(date -Iseconds)
	local suffix=""
	[[ -n "$status" ]] && suffix=" $status"
	# Ensure directory exists (inside function for robustness)
	mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null
	(
		flock -x 200
		echo "=== $event$suffix $timestamp ===" >> "$LOG_FILE"
	) 200>"$LOG_LOCK"
}
