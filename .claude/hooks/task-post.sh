#!/bin/bash
# PostToolUse hook for Task - assembles subagent output file for master-agent
# Only processes code-reviewer, test-runner, and pusher subagents
#
# Subagents write their structured output to {agent}.json via the Write tool.
# This hook reads that file, validates it, and creates the final -output.txt
# with a human-readable markdown template.

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Only process specific subagent types
case "$SUBAGENT" in
	code-reviewer|test-runner|pusher)
		;;
	*)
		exit 0
		;;
esac

# Output directory and files
OUTPUT_DIR="/tmp/claude/sub-agents/output"
mkdir -p "$OUTPUT_DIR"
SUBAGENT_JSON_FILE="$OUTPUT_DIR/${SUBAGENT}.json"
FINAL_OUTPUT_FILE="$OUTPUT_DIR/${SUBAGENT}-output.txt"

# === INPUT VALIDATION ===
INPUT_JSON=$(echo "$PROMPT" | jq '.' 2>/dev/null)
if [ $? -ne 0 ] || [ -z "$INPUT_JSON" ]; then
	INPUT_JSON='{"parse_error": "Input prompt is not valid JSON"}'
fi

# === OUTPUT VALIDATION ===
# Read the JSON file written by the subagent
if [ -f "$SUBAGENT_JSON_FILE" ]; then
	OUTPUT_JSON=$(cat "$SUBAGENT_JSON_FILE" | jq '.' 2>/dev/null)
	if [ $? -ne 0 ] || [ -z "$OUTPUT_JSON" ]; then
		OUTPUT_JSON='{"error": "Subagent output file is not valid JSON", "agent": "'"$SUBAGENT"'", "action": "RETRY"}'
	fi
else
	OUTPUT_JSON='{"error": "Subagent did not write output file", "agent": "'"$SUBAGENT"'", "action": "RETRY", "expected_file": "'"$SUBAGENT_JSON_FILE"'"}'
fi

# Pretty-print for readability
INPUT_PRETTY=$(echo "$INPUT_JSON" | jq '.' 2>/dev/null || echo "$INPUT_JSON")
OUTPUT_PRETTY=$(echo "$OUTPUT_JSON" | jq '.' 2>/dev/null || echo "$OUTPUT_JSON")

# Write final output file with markdown template
cat > "$FINAL_OUTPUT_FILE" << 'HEADER'
═══════════════════════════════════════════════════════════════════════════════
HEADER
echo "SUBAGENT: ${SUBAGENT}" >> "$FINAL_OUTPUT_FILE"
echo "TIMESTAMP: $(date -Iseconds)" >> "$FINAL_OUTPUT_FILE"
cat >> "$FINAL_OUTPUT_FILE" << 'DIVIDER'
═══════════════════════════════════════════════════════════════════════════════

INPUT:
────────────────────────────────────────────────────────────────────────────────
DIVIDER
echo "$INPUT_PRETTY" >> "$FINAL_OUTPUT_FILE"
cat >> "$FINAL_OUTPUT_FILE" << 'MIDDLE'
────────────────────────────────────────────────────────────────────────────────

OUTPUT:
────────────────────────────────────────────────────────────────────────────────
MIDDLE
echo "$OUTPUT_PRETTY" >> "$FINAL_OUTPUT_FILE"
cat >> "$FINAL_OUTPUT_FILE" << 'FOOTER'
────────────────────────────────────────────────────────────────────────────────
FOOTER

# Clean up the subagent's JSON file after processing
rm -f "$SUBAGENT_JSON_FILE"

exit 0
