#!/usr/bin/env bash
# verify-bulk-and-push.sh — Verify 6 QA signatures and push if all valid
#
# Usage:
#   verify-bulk-and-push.sh '<approvals_json>' [branch]
#   verify-bulk-and-push.sh --override '<token>' [branch]
#
# Approvals JSON format:
#   [{"payload":"...","signature":"..."},{"payload":"...","signature":"..."}, ...]
#
# Requires crypto-gate 0.5.0+ with verify-bulk support.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRYPTO_GATE="${SCRIPT_DIR}/../../../bin/crypto-gate"
SHARED_SCRIPTS="$SCRIPT_DIR/../../shared/scripts"

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
	error "Usage: verify-bulk-and-push.sh '<approvals_json>' [branch]
       verify-bulk-and-push.sh --override '<token>' [branch]"
fi

# Override mode
if [[ "$1" == "--override" ]]; then
	if [[ $# -lt 2 ]]; then
		error "Override mode requires a token"
	fi
	TOKEN="$2"
	BRANCH="${3:-$(git branch --show-current)}"

	echo "Override mode — verifying token..."
	RESULT=$("$CRYPTO_GATE" verify-override "$TOKEN" 2>&1) || error "Override verification failed: $RESULT"

	echo "Override verified. Pushing to $BRANCH..."
	git push -u origin "$BRANCH" || error "Git push failed"

	success "✅ PUSH SUCCESSFUL (override)"
	echo "Branch: $BRANCH"
	echo "Commit: $(git rev-parse HEAD)"
	# Clean up QA output files for next workflow
	"$SHARED_SCRIPTS/cleanup-qa-outputs.sh" 2>/dev/null || true
	exit 0
fi

# Normal mode — bulk verification
APPROVALS_JSON="$1"
BRANCH="${2:-$(git branch --show-current)}"

# Validate JSON structure
if ! echo "$APPROVALS_JSON" | jq -e 'type == "array"' >/dev/null 2>&1; then
	error "Approvals must be a JSON array"
fi

APPROVAL_COUNT=$(echo "$APPROVALS_JSON" | jq 'length')
if [[ "$APPROVAL_COUNT" -ne 6 ]]; then
	error "Expected exactly 6 approvals, got $APPROVAL_COUNT"
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

success "All 6 signatures verified!"

# Verify HEAD commit is in at least one payload
HEAD_COMMIT=$(git rev-parse HEAD)
COMMITS_IN_PAYLOADS=$(echo "$APPROVALS_JSON" | jq -r '.[].payload' | while read -r payload; do
	echo "$payload" | jq -r '.commits[]?' 2>/dev/null || true
done | sort -u)

if ! echo "$COMMITS_IN_PAYLOADS" | grep -q "$HEAD_COMMIT"; then
	error "HEAD commit $HEAD_COMMIT not found in any approval payload. Re-run QA review."
fi

echo "HEAD commit verified in payloads."
echo "Pushing to $BRANCH..."

git push -u origin "$BRANCH" || error "Git push failed"

success "✅ PUSH SUCCESSFUL"
echo "Branch: $BRANCH"
echo "Commit: $HEAD_COMMIT"

# Clean up QA output files for next workflow
"$SHARED_SCRIPTS/cleanup-qa-outputs.sh" 2>/dev/null || true