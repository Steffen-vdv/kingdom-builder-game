#!/bin/bash
# PostToolUse hook for Task - writes subagent output to files for Web UI transparency
# Only processes code-reviewer, test-runner, and pusher subagents

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')
RESPONSE=$(echo "$INPUT" | jq -c '.tool_response // {}')

# Only process specific subagent types
case "$SUBAGENT" in
	code-reviewer|test-runner|pusher)
		;;
	*)
		exit 0
		;;
esac

# Output directory and file (XDG_RUNTIME_DIR for context manager alignment)
OUTPUT_DIR="${XDG_RUNTIME_DIR:-/tmp}/claude/sub-agents/output"
mkdir -p "$OUTPUT_DIR"
OUTPUT_FILE="$OUTPUT_DIR/${SUBAGENT}-output.txt"

# Extract full text from response
FULL_TEXT=$(echo "$RESPONSE" | jq -r '.content[].text // ""' 2>/dev/null)

# === INPUT VALIDATION ===
# Prompt should be pure JSON (per protocol spec)
INPUT_JSON=$(echo "$PROMPT" | jq '.' 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$INPUT_JSON" ]; then
	INPUT_JSON='{"parse_error": "Input prompt is not valid JSON"}'
fi

# === OUTPUT VALIDATION ===
# Response should be pure JSON with response-formal-json field
OUTPUT_JSON=$(echo "$FULL_TEXT" | jq '.' 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$OUTPUT_JSON" ]; then
	FORMAL_JSON='{"error": "Response is not valid JSON", "agent": "'"$SUBAGENT"'", "action": "RETRY"}'
else
	# Extract response-formal-json
	FORMAL_JSON=$(echo "$OUTPUT_JSON" | jq '.["response-formal-json"] // null' 2>/dev/null)
	if [ "$FORMAL_JSON" = "null" ] || [ -z "$FORMAL_JSON" ]; then
		FORMAL_JSON='{"error": "Missing response-formal-json field", "agent": "'"$SUBAGENT"'", "action": "RETRY"}'
	fi
fi

# Pretty-print for readability
INPUT_PRETTY=$(echo "$INPUT_JSON" | jq '.' 2>/dev/null || echo "$INPUT_JSON")
FORMAL_PRETTY=$(echo "$FORMAL_JSON" | jq '.' 2>/dev/null || echo "$FORMAL_JSON")

# Write output file with 5 backticks to handle nested code blocks
cat > "$OUTPUT_FILE" << 'HEADER'
═══════════════════════════════════════════════════════════════════════════════
HEADER
echo "SUBAGENT: ${SUBAGENT}" >> "$OUTPUT_FILE"
echo "TIMESTAMP: $(date -Iseconds)" >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'DIVIDER'
═══════════════════════════════════════════════════════════════════════════════

INPUT:
────────────────────────────────────────────────────────────────────────────────
`````json
DIVIDER
echo "$INPUT_PRETTY" >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'MIDDLE'
`````
────────────────────────────────────────────────────────────────────────────────

RESPONSE (response-formal-json):
────────────────────────────────────────────────────────────────────────────────
`````json
MIDDLE
echo "$FORMAL_PRETTY" >> "$OUTPUT_FILE"
cat >> "$OUTPUT_FILE" << 'FOOTER'
`````
────────────────────────────────────────────────────────────────────────────────
FOOTER

exit 0
