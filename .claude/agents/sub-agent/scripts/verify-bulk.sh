#!/usr/bin/env bash
# verify-bulk.sh — Verify multiple QA signatures without pushing
#
# Usage:
#   verify-bulk.sh '<approvals_json>' [expected_count]
#
# Approvals JSON format:
#   [{"payload":"...","signature":"...","type":"..."},...]
#
# This script verifies signatures only. It does NOT push.
# Used by review-lead to validate Phase 1 reviewer signatures before
# producing the final QA_FINAL_SIGNATORY.
#
# Requires crypto-gate 0.5.0+ with verify-bulk support.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRYPTO_GATE="${SCRIPT_DIR}/../../../bin/crypto-gate"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

error() { echo -e "${RED}ERROR:${NC} $1" >&2; exit 1; }
success() { echo -e "${GREEN}$1${NC}"; }
warn() { echo -e "${YELLOW}$1${NC}"; }

# Check crypto-gate exists
if [[ ! -x "$CRYPTO_GATE" ]]; then
	error "crypto-gate not found at $CRYPTO_GATE"
fi

# Parse arguments
if [[ $# -lt 1 ]]; then
	cat >&2 << 'USAGE'
Usage: verify-bulk.sh '<approvals_json>' [expected_count]

Arguments:
  approvals_json  JSON array of approval objects
  expected_count  Expected number of approvals (default: 6)

Each approval object must have: payload, signature, type

Example:
  verify-bulk.sh '[{"payload":"...","signature":"...","type":"QA_CLAIMS_AUDITOR"}]' 6
USAGE
	exit 1
fi

APPROVALS_JSON="$1"
EXPECTED_COUNT="${2:-6}"

# Validate JSON structure
if ! echo "$APPROVALS_JSON" | jq -e 'type == "array"' >/dev/null 2>&1; then
	error "Approvals must be a JSON array"
fi

APPROVAL_COUNT=$(echo "$APPROVALS_JSON" | jq 'length')
if [[ "$APPROVAL_COUNT" -ne "$EXPECTED_COUNT" ]]; then
	error "Expected exactly $EXPECTED_COUNT approvals, got $APPROVAL_COUNT"
fi

echo "Verifying $APPROVAL_COUNT signatures with crypto-gate verify-bulk..."

# Call crypto-gate verify-bulk
VERIFY_RESULT=$("$CRYPTO_GATE" verify-bulk "$APPROVALS_JSON" 2>&1) || {
	error "crypto-gate verify-bulk failed: $VERIFY_RESULT"
}

# Parse result
if ! echo "$VERIFY_RESULT" | jq -e '.success == true' >/dev/null 2>&1; then
	# Extract which signatures failed
	FAILED=$(echo "$VERIFY_RESULT" | jq -r '.results | to_entries | map(select(.value.valid == false)) | map(.key) | join(", ")')
	error "Signature verification failed for indices: $FAILED"
fi

# Check all results are valid
INVALID_COUNT=$(echo "$VERIFY_RESULT" | jq '[.results[] | select(.valid == false)] | length')
if [[ "$INVALID_COUNT" -gt 0 ]]; then
	error "$INVALID_COUNT signatures failed verification"
fi

success "✅ All $APPROVAL_COUNT signatures verified!"

# Verify HEAD commit is in at least one payload
HEAD_COMMIT=$(git rev-parse HEAD)
COMMITS_IN_PAYLOADS=$(echo "$APPROVALS_JSON" | jq -r '.[].payload' | while read -r payload; do
	# payload might be escaped JSON string or raw JSON
	if [[ "$payload" == \"* ]]; then
		# Escaped JSON string - unescape first
		echo "$payload" | jq -r '.' | jq -r '.commits[]?' 2>/dev/null || true
	else
		# Raw JSON
		echo "$payload" | jq -r '.commits[]?' 2>/dev/null || true
	fi
done | sort -u)

if ! echo "$COMMITS_IN_PAYLOADS" | grep -q "$HEAD_COMMIT"; then
	error "HEAD commit $HEAD_COMMIT not found in any approval payload. Signatures are stale."
fi

success "✅ HEAD commit verified in payloads"

# Output summary for caller
echo ""
echo "Verification complete:"
echo "  Signatures: $APPROVAL_COUNT valid"
echo "  HEAD: $HEAD_COMMIT"
echo "  Status: PASSED"
