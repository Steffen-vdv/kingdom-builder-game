#!/bin/bash
#
# user-prompt-submit.sh — UserPromptSubmit hook for logging prompts
#
# This hook logs user prompts to enable intent reconstruction for QA.
# The prompt log is used by pre-task hooks to build canonical QA input.
#
# MUST NEVER BLOCK (exit 0 always).
#

# Don't use set -e - we never want to block
set +e

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(pwd)"

# Source log.sh for optional logging
LOG_FILE="/tmp/claude/hooks/user-prompt-submit.log"
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null

# Read stdin JSON
INPUT=$(cat)

# Extract session_id - try multiple possible locations
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // .sessionId // .session // ""' 2>/dev/null)
if [[ -z "$SESSION_ID" ]]; then
	SESSION_ID="unknown"
fi

# Extract cwd
CWD=$(echo "$INPUT" | jq -r '.cwd // .working_directory // ""' 2>/dev/null)
if [[ -z "$CWD" ]]; then
	CWD="$(pwd)"
fi

# Extract prompt text - try multiple possible field names
PROMPT_TEXT=$(echo "$INPUT" | jq -r '.prompt // .user_prompt // .text // .input // .message // ""' 2>/dev/null)
if [[ -z "$PROMPT_TEXT" || "$PROMPT_TEXT" == "null" ]]; then
	# If no specific field found, store a summary of the JSON
	PROMPT_TEXT=$(echo "$INPUT" | jq -c '.' 2>/dev/null || echo "$INPUT")
fi

# Get timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Ensure prompt log directory exists
PROMPT_LOG_DIR="/tmp/claude/qa/prompt-log"
mkdir -p "$PROMPT_LOG_DIR" 2>/dev/null

# Build log entry
LOG_ENTRY=$(jq -n -c \
	--arg ts "$TIMESTAMP" \
	--arg session_id "$SESSION_ID" \
	--arg cwd "$CWD" \
	--arg prompt "$PROMPT_TEXT" \
	'{ts: $ts, session_id: $session_id, cwd: $cwd, prompt: $prompt}' 2>/dev/null)

if [[ -n "$LOG_ENTRY" ]]; then
	# Append to session-specific log file
	echo "$LOG_ENTRY" >> "$PROMPT_LOG_DIR/${SESSION_ID}.jsonl" 2>/dev/null
fi

# Optional: also log to central log for debugging
echo "[$TIMESTAMP] prompt logged for session $SESSION_ID" >> "$LOG_FILE" 2>/dev/null

# NEVER BLOCK
exit 0
