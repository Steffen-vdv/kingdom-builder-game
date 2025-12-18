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

OUTPUT_DIR="/tmp/claude/sub-agents/output"

if [[ ! -d "$OUTPUT_DIR" ]]; then
	echo "✓ No output directory to clean"
	exit 0
fi

# Remove all reviewer JSON files
REMOVED=0
for agent in review-ci-tests-required review-claims-auditor review-contracts-boundaries \
             review-mechanics-content review-infra-concurrency review-tests-docs-dry \
             review-lead; do
	FILE="$OUTPUT_DIR/${agent}.json"
	if [[ -f "$FILE" ]]; then
		rm -f "$FILE"
		((REMOVED++)) || true
	fi
done

if [[ $REMOVED -gt 0 ]]; then
	echo "✓ Cleaned $REMOVED QA output file(s)"
else
	echo "✓ No QA output files to clean"
fi
