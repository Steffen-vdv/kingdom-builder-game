#!/bin/bash
#
# user-prompt-submit.sh — UserPromptSubmit hook for logging prompts
#
# This hook logs user prompts to enable intent reconstruction for QA.
# The prompt log is used by qa-prepare.sh to build canonical QA input.
#
# MUST NEVER BLOCK (exit 0 always).
#
# Each session gets a fresh /tmp, so we use a fixed filename.
#

# Don't use set -e - we never want to block
set +e

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(pwd)"

# Read stdin JSON
INPUT=$(cat)

# Extract prompt text - try multiple possible field names
PROMPT_TEXT=$(echo "$INPUT" | jq -r '.prompt // .user_prompt // .text // .input // .message // ""' 2>/dev/null)
if [[ -z "$PROMPT_TEXT" || "$PROMPT_TEXT" == "null" ]]; then
	# If no specific field found, store the raw JSON
	PROMPT_TEXT=$(echo "$INPUT" | jq -c '.' 2>/dev/null || echo "$INPUT")
fi

# Get timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Fixed prompt log file (each session gets fresh /tmp)
PROMPT_LOG_FILE="/tmp/claude/qa/prompts.jsonl"
mkdir -p "$(dirname "$PROMPT_LOG_FILE")" 2>/dev/null

# Build and append log entry
jq -n -c \
	--arg ts "$TIMESTAMP" \
	--arg prompt "$PROMPT_TEXT" \
	'{ts: $ts, prompt: $prompt}' >> "$PROMPT_LOG_FILE" 2>/dev/null

# NEVER BLOCK
exit 0
