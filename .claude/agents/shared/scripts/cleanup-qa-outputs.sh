#!/bin/bash
#
# cleanup-qa-outputs.sh — Clear QA output files after successful push
#
# Usage: cleanup-qa-outputs.sh
#
# Removes all Phase 1 and Phase 2 JSON output files.
# Called by safe-deployment-gate after successful push.
#
# This ensures the next QA workflow starts with a clean slate,
# preventing stale prior state from affecting new reviews.
#

set -euo pipefail

# Load paths from config
source "${CLAUDE_PROJECT_DIR:-.}/.claude/config/paths.sh"

# Load agent list from config
_CONFIG="${CLAUDE_PROJECT_DIR:-.}/.claude/config/qa-agents.json"

if [[ ! -d "$QA_OUTPUT_DIR" ]]; then
	echo "✓ No output directory to clean"
	exit 0
fi

# Remove all reviewer JSON files (Phase 1 + Phase 2)
REMOVED=0

# Get Phase 1 agents from config
while read -r agent; do
	FILE="$QA_OUTPUT_DIR/${agent}.json"
	if [[ -f "$FILE" ]]; then
		rm -f "$FILE"
		((REMOVED++)) || true
	fi
done < <(jq -r '.phase1_reviewers[]' "$_CONFIG" 2>/dev/null)

# Also remove Phase 2 aggregator output
PHASE2=$(jq -r '.phase2_aggregator' "$_CONFIG" 2>/dev/null)
if [[ -n "$PHASE2" && -f "$QA_OUTPUT_DIR/${PHASE2}.json" ]]; then
	rm -f "$QA_OUTPUT_DIR/${PHASE2}.json"
	((REMOVED++)) || true
fi

if [[ $REMOVED -gt 0 ]]; then
	echo "✓ Cleaned $REMOVED QA output file(s)"
else
	echo "✓ No QA output files to clean"
fi
