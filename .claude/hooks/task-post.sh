#!/bin/bash
# PostToolUse hook for Task - writes subagent output to files for transparency
# Only processes code-reviewer, test-runner, and pusher subagents

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // "N/A"')
RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // "N/A"')

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

# Write output (overwrites existing content)
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
${RESPONSE}
────────────────────────────────────────────────────────────────────────────────
EOF

exit 0
