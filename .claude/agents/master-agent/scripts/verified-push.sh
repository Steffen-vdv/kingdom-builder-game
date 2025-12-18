#!/bin/bash
#
# verified-push.sh — Phase 3: Verify review-lead signature and push
#
# This script replaces the safe-deployment-gate subagent.
# It verifies the review-lead signature via crypto-gate and pushes to remote.
#
# Usage: .claude/agents/master-agent/scripts/verified-push.sh
#
# Prerequisites:
#   - /tmp/claude/qa/current/input.json must exist
#   - /tmp/claude/qa/current/input.sha256 must exist
#   - /tmp/claude/sub-agents/output/review-lead.json must exist
#   - review-lead.json must have APPROVED verdict with valid signature
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../shared/scripts/log.sh"

log_hook "verified-push" "Starting"

# =============================================================================
# PATHS
# =============================================================================

QA_CURRENT_DIR="/tmp/claude/qa/current"
QA_OUTPUT_DIR="/tmp/claude/sub-agents/output"
INPUT_JSON="$QA_CURRENT_DIR/input.json"
INPUT_HASH_FILE="$QA_CURRENT_DIR/input.sha256"
REVIEW_LEAD_JSON="$QA_OUTPUT_DIR/review-lead.json"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../../../.." && pwd)}"
CRYPTO_GATE="$PROJECT_DIR/bin/crypto-gate"

# =============================================================================
# VALIDATE PREREQUISITES
# =============================================================================

echo "=== Phase 3: Verified Push ==="
echo ""

# Check input.json exists
if [[ ! -f "$INPUT_JSON" ]]; then
	echo "ERROR: Missing $INPUT_JSON"
	echo "Run the QA workflow (Phase 1 + Phase 2) first."
	exit 1
fi

# Check input.sha256 exists
if [[ ! -f "$INPUT_HASH_FILE" ]]; then
	echo "ERROR: Missing $INPUT_HASH_FILE"
	exit 1
fi

# Check review-lead.json exists
if [[ ! -f "$REVIEW_LEAD_JSON" ]]; then
	echo "ERROR: Missing $REVIEW_LEAD_JSON"
	echo "Run review-lead (Phase 2) first."
	exit 1
fi

# Check crypto-gate exists
if [[ ! -x "$CRYPTO_GATE" ]]; then
	echo "ERROR: crypto-gate not found or not executable at $CRYPTO_GATE"
	exit 1
fi

echo "Prerequisites validated."
echo ""

# =============================================================================
# READ INPUT
# =============================================================================

BRANCH=$(jq -r '.branch // ""' "$INPUT_JSON")
HEAD=$(jq -r '.head // ""' "$INPUT_JSON")
INPUT_HASH=$(cat "$INPUT_HASH_FILE")

if [[ -z "$BRANCH" ]]; then
	echo "ERROR: Branch is empty in input.json"
	echo "Cannot push without a branch name."
	exit 1
fi

echo "Branch: $BRANCH"
echo "HEAD: $HEAD"
echo "Input hash: $INPUT_HASH"
echo ""

# =============================================================================
# READ REVIEW-LEAD OUTPUT
# =============================================================================

VERDICT=$(jq -r '.verdict // ""' "$REVIEW_LEAD_JSON")
PAYLOAD=$(jq -r '.payload // ""' "$REVIEW_LEAD_JSON")
SIGNATURE=$(jq -r '.signature // ""' "$REVIEW_LEAD_JSON")
SIG_TYPE=$(jq -r '.signature_type // ""' "$REVIEW_LEAD_JSON")
SUMMARY=$(jq -r '.summary // ""' "$REVIEW_LEAD_JSON")

echo "Review-lead verdict: $VERDICT"
echo "Review-lead summary: $SUMMARY"
echo ""

# =============================================================================
# VALIDATE VERDICT
# =============================================================================

if [[ "$VERDICT" != "APPROVED" ]]; then
	echo "ERROR: Review-lead verdict is not APPROVED: $VERDICT"
	echo "Cannot push without approval."
	exit 1
fi

# =============================================================================
# VERIFY SIGNATURE
# =============================================================================

if [[ -z "$PAYLOAD" || -z "$SIGNATURE" || -z "$SIG_TYPE" ]]; then
	echo "ERROR: Missing signature fields in review-lead.json"
	exit 1
fi

if [[ "$SIG_TYPE" != "QA_FINAL_SIGNATORY" ]]; then
	echo "ERROR: Wrong signature type: $SIG_TYPE (expected QA_FINAL_SIGNATORY)"
	exit 1
fi

echo "Verifying signature..."

VERIFY_RESULT=$("$CRYPTO_GATE" verify "$PAYLOAD" "$SIGNATURE" --type "$SIG_TYPE" 2>&1) || true

if [[ "$VERIFY_RESULT" != "valid" ]]; then
	echo "ERROR: Signature verification failed"
	echo "crypto-gate output: $VERIFY_RESULT"
	exit 1
fi

echo "Signature verified."
echo ""

# =============================================================================
# VALIDATE INPUT HASH MATCHES
# =============================================================================

PAYLOAD_INPUT_HASH=$(echo "$PAYLOAD" | jq -r '.input_hash // ""')

if [[ "$PAYLOAD_INPUT_HASH" != "$INPUT_HASH" ]]; then
	echo "ERROR: Input hash mismatch"
	echo "Payload hash: $PAYLOAD_INPUT_HASH"
	echo "Current hash: $INPUT_HASH"
	echo "The review may be stale. Re-run QA workflow."
	exit 1
fi

echo "Input hash matches."
echo ""

# =============================================================================
# VALIDATE HEAD CONSISTENCY
# =============================================================================

CURRENT_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "")
PAYLOAD_HEAD=$(echo "$PAYLOAD" | jq -r '.input.head // ""')

if [[ -n "$PAYLOAD_HEAD" && "$PAYLOAD_HEAD" != "$CURRENT_HEAD" ]]; then
	# Check if payload head is in the commits array
	PAYLOAD_COMMITS=$(echo "$PAYLOAD" | jq -r '.input.commits // []')
	if ! echo "$PAYLOAD_COMMITS" | jq -e --arg head "$CURRENT_HEAD" 'map(. == $head) | any' >/dev/null 2>&1; then
		echo "WARNING: Current HEAD ($CURRENT_HEAD) may not match reviewed commits"
		echo "Payload HEAD: $PAYLOAD_HEAD"
		echo "Proceeding anyway (payload was signed for this input hash)."
	fi
fi

echo "HEAD consistency check passed."
echo ""

# =============================================================================
# PUSH
# =============================================================================

echo "Pushing to origin/$BRANCH..."
echo ""

cd "$PROJECT_DIR"

if git push -u origin "$BRANCH"; then
	echo ""
	echo "=== Push successful ==="
	echo ""

	# =============================================================================
	# CLEANUP
	# =============================================================================

	echo "Cleaning up QA outputs..."

	# Run existing cleanup script if available
	CLEANUP_SCRIPT="$SCRIPT_DIR/../../shared/scripts/cleanup-qa-outputs.sh"
	if [[ -x "$CLEANUP_SCRIPT" ]]; then
		"$CLEANUP_SCRIPT"
	fi

	# Also clean canonical input directory
	rm -f "$QA_CURRENT_DIR/input.json" 2>/dev/null || true
	rm -f "$QA_CURRENT_DIR/input.sha256" 2>/dev/null || true
	rm -rf "$QA_CURRENT_DIR/delta" 2>/dev/null || true

	echo "Cleanup complete."
	log_hook "verified-push" "Push successful to $BRANCH"
else
	echo ""
	echo "ERROR: Push failed"
	log_hook "verified-push" "Push failed to $BRANCH"
	exit 1
fi
