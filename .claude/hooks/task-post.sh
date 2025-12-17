#!/bin/bash
# PostToolUse hook for Task - writes subagent output to files for transparency
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
		# Not a tracked subagent, exit silently
		exit 0
		;;
esac

# Output directory
OUTPUT_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks/output"
mkdir -p "$OUTPUT_DIR"

# Output file (wiped on each run via >)
OUTPUT_FILE="$OUTPUT_DIR/${SUBAGENT}-output.txt"

# Function to clean text content:
# 1. Strip triple backticks (prevents markdown interpretation)
# 2. Strip TOP reminder block (from start to "This is a MANDATORY step" line)
# 3. Strip trailing noise lines (keep lines with alphanumeric or JSON chars {})
clean_text() {
	sed 's/```//g' \
		| sed '1,/^This is a MANDATORY step/d' \
		| sed '1{/^═/d}' \
		| tac | sed -n '/[A-Za-z0-9{}]/,$p' | tac
}

# Write header and prompt (overwrites existing content)
cat > "$OUTPUT_FILE" << EOF
═══════════════════════════════════════════════════════════════════════════════
SUBAGENT: ${SUBAGENT}
TIMESTAMP: $(date -Iseconds)
═══════════════════════════════════════════════════════════════════════════════

DISPATCH PROMPT:
────────────────────────────────────────────────────────────────────────────────
${PROMPT}
────────────────────────────────────────────────────────────────────────────────

SUBAGENT RESPONSE:
────────────────────────────────────────────────────────────────────────────────
EOF

# Parse and format content array
CONTENT_LENGTH=$(echo "$RESPONSE" | jq '.content | length // 0')

if [ "$CONTENT_LENGTH" -eq 0 ]; then
	echo "(no content)" >> "$OUTPUT_FILE"
else
	for i in $(seq 0 $((CONTENT_LENGTH - 1))); do
		INDEX=$((i + 1))
		CONTENT_TYPE=$(echo "$RESPONSE" | jq -r ".content[$i].type // \"unknown\"")

		echo "" >> "$OUTPUT_FILE"
		echo "===Output ${INDEX}===" >> "$OUTPUT_FILE"
		echo "" >> "$OUTPUT_FILE"

		if [ "$CONTENT_TYPE" = "text" ]; then
			# For text type: extract .text, interpret escapes, then clean
			echo "$RESPONSE" | jq -r ".content[$i].text // \"\"" | clean_text >> "$OUTPUT_FILE"
		else
			# For non-text type: output full JSON of that content entry
			echo "$RESPONSE" | jq ".content[$i]" >> "$OUTPUT_FILE"
		fi
	done
fi

echo "" >> "$OUTPUT_FILE"
echo "────────────────────────────────────────────────────────────────────────────────" >> "$OUTPUT_FILE"

# Validate response format: check for ---RESPONSE--- delimiter
FULL_TEXT=$(echo "$RESPONSE" | jq -r '.content[].text // ""' 2>/dev/null | tr -d '\n')

if ! echo "$FULL_TEXT" | grep -q '\-\-\-RESPONSE\-\-\-'; then
	# Write warning to file
	echo "" >> "$OUTPUT_FILE"
	echo "⚠️  FORMAT WARNING: Response missing ---RESPONSE--- delimiter" >> "$OUTPUT_FILE"
	echo "    Subagent should end with: ---RESPONSE--- followed by JSON block" >> "$OUTPUT_FILE"
	echo "    See: agent-intercommunication-protocols.md" >> "$OUTPUT_FILE"

	# Output structured error to stdout for master-agent to see and act on
	cat << EOF

---SUBAGENT_FORMAT_ERROR---
{
  "agent": "${SUBAGENT}",
  "error": "Response missing ---RESPONSE--- delimiter",
  "action": "RETRY",
  "instruction": "Re-dispatch this subagent. Remind it to follow the response structure in agent-intercommunication-protocols.md: TOP reminder block, ---NARRATIVE---, then ---RESPONSE--- with JSON."
}
---END_FORMAT_ERROR---

EOF
fi

exit 0
