#!/bin/bash
#
# collect-phase1-assessments.sh — Aggregate Phase 1 reviewer outputs into approvals_json
#
# Usage:
#   collect-phase1-assessments.sh
#
# Reads all 6 Phase 1 reviewer output files, validates them, and outputs
# a JSON array suitable for the review-lead `approvals_json` input field.
#
# Exit codes:
#   0 - Success, JSON array written to stdout
#   1 - One or more files missing or invalid
#
# Expected file locations:
#   /tmp/claude/sub-agents/output/review-ci-tests-required.json
#   /tmp/claude/sub-agents/output/review-claims-auditor.json
#   /tmp/claude/sub-agents/output/review-contracts-boundaries.json
#   /tmp/claude/sub-agents/output/review-mechanics-content.json
#   /tmp/claude/sub-agents/output/review-infra-concurrency.json
#   /tmp/claude/sub-agents/output/review-tests-docs-dry.json
#

set -euo pipefail

OUTPUT_DIR="/tmp/claude/sub-agents/output"

# Phase 1 agent identifiers (in order)
AGENTS=(
	"review-ci-tests-required"
	"review-claims-auditor"
	"review-contracts-boundaries"
	"review-mechanics-content"
	"review-infra-concurrency"
	"review-tests-docs-dry"
)

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

ERRORS=()

for agent in "${AGENTS[@]}"; do
	FILE="$OUTPUT_DIR/${agent}.json"

	# Check file exists
	if [[ ! -f "$FILE" ]]; then
		ERRORS+=("Missing: $FILE")
		continue
	fi

	# Check valid JSON
	if ! jq empty "$FILE" 2>/dev/null; then
		ERRORS+=("Invalid JSON: $FILE")
		continue
	fi

	# Check verdict is APPROVED
	VERDICT=$(jq -r '.verdict // empty' "$FILE" 2>/dev/null)
	if [[ "$VERDICT" != "APPROVED" ]]; then
		ERRORS+=("$agent: verdict is '$VERDICT', expected 'APPROVED'")
		continue
	fi

	# Check required signature fields exist
	PAYLOAD=$(jq -r '.payload // empty' "$FILE" 2>/dev/null)
	SIGNATURE=$(jq -r '.signature // empty' "$FILE" 2>/dev/null)
	SIG_TYPE=$(jq -r '.signature_type // empty' "$FILE" 2>/dev/null)

	if [[ -z "$PAYLOAD" ]]; then
		ERRORS+=("$agent: missing 'payload' field")
	fi
	if [[ -z "$SIGNATURE" ]]; then
		ERRORS+=("$agent: missing 'signature' field")
	fi
	if [[ -z "$SIG_TYPE" ]]; then
		ERRORS+=("$agent: missing 'signature_type' field")
	fi
done

# Report errors and exit if any
if [[ ${#ERRORS[@]} -gt 0 ]]; then
	cat >&2 << 'ERROR_HEADER'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PHASE 1 COLLECTION FAILED                                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Cannot assemble approvals_json. The following errors were found:

ERROR_HEADER
	for err in "${ERRORS[@]}"; do
		echo "  • $err" >&2
	done
	echo "" >&2
	echo "Fix the issues and re-run Phase 1 reviewers." >&2
	exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD APPROVALS ARRAY
# ═══════════════════════════════════════════════════════════════════════════════

# Build JSON array using jq
# Each element: { "payload": "...", "signature": "...", "type": "..." }
# Note: signature_type is renamed to "type" for review-lead input schema

APPROVALS="["
FIRST=true

for agent in "${AGENTS[@]}"; do
	FILE="$OUTPUT_DIR/${agent}.json"

	# Extract fields
	PAYLOAD=$(jq -r '.payload' "$FILE")
	SIGNATURE=$(jq -r '.signature' "$FILE")
	SIG_TYPE=$(jq -r '.signature_type' "$FILE")

	# Build approval object
	# Use jq to properly escape the payload string
	APPROVAL=$(jq -n \
		--arg payload "$PAYLOAD" \
		--arg signature "$SIGNATURE" \
		--arg type "$SIG_TYPE" \
		'{payload: $payload, signature: $signature, type: $type}')

	if [[ "$FIRST" == "true" ]]; then
		APPROVALS+="$APPROVAL"
		FIRST=false
	else
		APPROVALS+=",$APPROVAL"
	fi
done

APPROVALS+="]"

# Output the JSON array (compact form)
echo "$APPROVALS" | jq -c '.'
