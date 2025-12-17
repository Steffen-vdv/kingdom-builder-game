#!/bin/bash
#
# write-output.sh — Write subagent JSON output file
#
# Usage: write-output.sh '<agent-name>' '<json-content>'
#
# Creates the output directory if needed and writes JSON to the correct path.
# Overwrites any existing file (ensures clean state for retries).
#
# Called by subagents before completing their session.
#

set -euo pipefail

AGENT="${1:-}"
JSON_CONTENT="${2:-}"

if [[ -z "$AGENT" ]]; then
	echo "ERROR: Agent name is required. Usage: write-output.sh '<agent>' '<json>'" >&2
	exit 1
fi

if [[ -z "$JSON_CONTENT" ]]; then
	echo "ERROR: JSON content is required. Usage: write-output.sh '<agent>' '<json>'" >&2
	exit 1
fi

# Validate JSON
if ! echo "$JSON_CONTENT" | jq '.' >/dev/null 2>&1; then
	echo "ERROR: Invalid JSON content" >&2
	exit 1
fi

# Output path
OUTPUT_DIR="/tmp/claude/sub-agents/output"
OUTPUT_FILE="$OUTPUT_DIR/${AGENT}.json"

# Create directory if needed
mkdir -p "$OUTPUT_DIR"

# Write JSON (overwrites existing file)
echo "$JSON_CONTENT" > "$OUTPUT_FILE"

echo "Output written to: $OUTPUT_FILE"
