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
# Environment:
#   PHASE1_OUTPUT_DIR - Override output directory (for testing)
#                       Default: /tmp/claude/sub-agents/output
#
# Exit codes:
#   0 - Success, JSON array written to stdout
#   1 - One or more files missing or invalid
#
# Expected file locations (default):
#   /tmp/claude/sub-agents/output/review-ci-tests-required.json
#   /tmp/claude/sub-agents/output/review-claims-auditor.json
#   /tmp/claude/sub-agents/output/review-contracts-boundaries.json
#   /tmp/claude/sub-agents/output/review-mechanics-content.json
#   /tmp/claude/sub-agents/output/review-infra-concurrency.json
#   /tmp/claude/sub-agents/output/review-tests-docs-dry.json
#

set -euo pipefail

# Source the canonical agent registry for validation
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../shared/config/agent-registry.sh"

OUTPUT_DIR="${PHASE1_OUTPUT_DIR:-/tmp/claude/sub-agents/output}"

# Phase 1 agent identifiers (in order) — excludes review-lead (Phase 2)
PHASE1_AGENTS=(
	"review-ci-tests-required"
	"review-claims-auditor"
	"review-contracts-boundaries"
	"review-mechanics-content"
	"review-infra-concurrency"
	"review-tests-docs-dry"
)

# AGENT_SIG_TYPES comes from agent-registry.sh (single source of truth)

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

ERRORS=()

for agent in "${PHASE1_AGENTS[@]}"; do
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

	# Security: Validate signature type matches expected type for this agent
	# This prevents copying one approval file to all 6 slots
	EXPECTED="${AGENT_SIG_TYPES[$agent]}"
	if [[ -n "$SIG_TYPE" && "$SIG_TYPE" != "$EXPECTED" ]]; then
		ERRORS+=("$agent: signature_type is '$SIG_TYPE', expected '$EXPECTED'")
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

	# Show what files DO exist for debugging
	echo "" >&2
	echo "Directory contents ($OUTPUT_DIR):" >&2
	if [[ -d "$OUTPUT_DIR" ]]; then
		EXISTING=$(ls -la "$OUTPUT_DIR"/*.json 2>/dev/null | awk '{print "  " $NF " (" $5 " bytes)"}')
		if [[ -n "$EXISTING" ]]; then
			echo "$EXISTING" >&2
		else
			echo "  (no .json files found)" >&2
		fi
	else
		echo "  (directory does not exist)" >&2
	fi

	# Show verdict summary for quick diagnosis
	echo "" >&2
	echo "Verdict summary:" >&2
	for agent in "${PHASE1_AGENTS[@]}"; do
		FILE="$OUTPUT_DIR/${agent}.json"
		if [[ -f "$FILE" ]]; then
			VERDICT=$(jq -r '.verdict // "PARSE_ERROR"' "$FILE" 2>/dev/null)
			echo "  • $agent: $VERDICT" >&2
		else
			echo "  • $agent: (file missing)" >&2
		fi
	done

	echo "" >&2
	echo "NEXT STEPS:" >&2
	echo "  • If files are missing: Re-run the missing Phase 1 reviewers" >&2
	echo "  • If verdict is BLOCKED: Address blockers, then re-run that reviewer" >&2
	echo "  • If verdict is NEEDS_INPUT: Provide answers, then re-run that reviewer" >&2
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

for agent in "${PHASE1_AGENTS[@]}"; do
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
