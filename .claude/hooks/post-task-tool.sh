#!/bin/bash
# PostToolUse hook for Task - validates subagent JSON output
# Only processes QA reviewers and safe-deployment-gate subagents
#
# Subagents write their structured output to {agent}.json via write-output.sh.
# This hook validates that file exists and contains valid JSON.
# Master-agent reads the .json file directly (only review-lead.json in new workflow).

source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')

# Only process specific subagent types
case "$SUBAGENT" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry|review-lead|safe-deployment-gate)
		log_hook "$SUBAGENT" "Stopped"
		;;
	*)
		exit 0
		;;
esac

# Check JSON output file
OUTPUT_DIR="/tmp/claude/sub-agents/output"
SUBAGENT_JSON_FILE="$OUTPUT_DIR/${SUBAGENT}.json"

if [ ! -f "$SUBAGENT_JSON_FILE" ]; then
	echo "Warning: Subagent $SUBAGENT did not write output file: $SUBAGENT_JSON_FILE" >&2
	exit 0
fi

# Validate JSON format
if ! jq '.' "$SUBAGENT_JSON_FILE" > /dev/null 2>&1; then
	echo "Warning: Subagent $SUBAGENT output is not valid JSON: $SUBAGENT_JSON_FILE" >&2
fi

exit 0
