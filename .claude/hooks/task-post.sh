#!/bin/bash
# PostToolUse hook for Task - writes subagent output to files for Web UI transparency
# Only processes code-reviewer, test-runner, and pusher subagents

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // "N/A"')
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

# Extract everything after ---RESPONSE--- (should be ONLY the JSON block)
# Strip the ```json and ``` fences
RESPONSE_JSON=$(echo "$FULL_TEXT" | sed -n '/^---RESPONSE---$/,$ p' | tail -n +2 | sed '/^```json$/d; /^```$/d')

# If nothing found, use placeholder
if [ -z "$RESPONSE_JSON" ]; then
	RESPONSE_JSON='{"error": "No ---RESPONSE--- block found in subagent output"}'
fi

# Write output file: header + input + response JSON
cat > "$OUTPUT_FILE" << EOF
═══════════════════════════════════════════════════════════════════════════════
SUBAGENT: ${SUBAGENT}
TIMESTAMP: $(date -Iseconds)
═══════════════════════════════════════════════════════════════════════════════

INPUT:
────────────────────────────────────────────────────────────────────────────────
${PROMPT}
────────────────────────────────────────────────────────────────────────────────

RESPONSE:
────────────────────────────────────────────────────────────────────────────────
${RESPONSE_JSON}
────────────────────────────────────────────────────────────────────────────────
EOF

exit 0
