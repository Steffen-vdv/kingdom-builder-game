#!/bin/bash
#
# set-override-token.sh — Store user-provided override token for expedited push
#
# Usage:
#   set-override-token.sh '<token>'
#   set-override-token.sh --clear
#
# This script stores the override token BOUND TO THE CURRENT HEAD in a file
# that the pre-task hook and safe-deployment-gate will read. This ensures the
# override is only valid for the specific commit it was authorized for.
#
# Token file location:
#   /tmp/claude/qa/current/override-token
#
# File format (JSON):
#   {"head":"<sha>","branch":"<branch>","token":"<token>"}
#
# The token is verified via crypto-gate before being stored to ensure only
# valid tokens are accepted.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"

QA_CURRENT_DIR="/tmp/claude/qa/current"
TOKEN_FILE="$QA_CURRENT_DIR/override-token"

# =============================================================================
# LOCATE CRYPTO-GATE
# =============================================================================

find_crypto_gate() {
	local wrapper="$CLAUDE_PROJECT_DIR/bin/crypto-gate"
	if [[ -x "$wrapper" ]]; then
		echo "$wrapper"
		return 0
	fi
	return 1
}

# =============================================================================
# CLEAR MODE
# =============================================================================

if [[ "${1:-}" == "--clear" ]]; then
	if [[ -f "$TOKEN_FILE" ]]; then
		rm -f "$TOKEN_FILE"
		echo "Override token cleared."
	else
		echo "No override token was set."
	fi
	exit 0
fi

# =============================================================================
# SET MODE
# =============================================================================

TOKEN="${1:-}"

if [[ -z "$TOKEN" ]]; then
	cat >&2 << 'USAGE'
Usage: set-override-token.sh '<token>'
       set-override-token.sh --clear

Stores a user-provided override token for expedited push workflow.
The token is verified via crypto-gate and bound to the current HEAD.

Token file: /tmp/claude/qa/current/override-token
Format: {"head":"<sha>","branch":"<branch>","token":"<token>"}

The override is only valid for the HEAD commit at the time of storage.
If HEAD changes after storing, the override will be rejected.

Examples:
  set-override-token.sh 'MySecretToken123'
  set-override-token.sh --clear
USAGE
	exit 1
fi

# Verify token via crypto-gate before storing
CRYPTO_GATE=$(find_crypto_gate) || {
	echo "ERROR: crypto-gate binary not found. Cannot verify token." >&2
	exit 1
}

echo "Verifying override token via crypto-gate..." >&2

if ! "$CRYPTO_GATE" verify-override "$TOKEN" >/dev/null 2>&1; then
	cat >&2 << 'INVALID'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ INVALID OVERRIDE TOKEN                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The provided token failed verification via crypto-gate.
Please check the token and try again.
INVALID
	exit 1
fi

# Get current HEAD and branch for binding
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null) || {
	echo "ERROR: Cannot determine HEAD. Are you in a git repository?" >&2
	exit 1
}

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || BRANCH=""
if [[ "$BRANCH" == "HEAD" ]]; then
	# Detached HEAD, use empty string
	BRANCH=""
fi

# Ensure directory exists
mkdir -p "$QA_CURRENT_DIR"

# Store token as JSON with HEAD binding (readable only by owner)
jq -n -c \
	--arg head "$HEAD_SHA" \
	--arg branch "$BRANCH" \
	--arg token "$TOKEN" \
	'{head: $head, branch: $branch, token: $token}' > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

cat << SUCCESS
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ✅ OVERRIDE TOKEN STORED                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Token verified and stored at: /tmp/claude/qa/current/override-token

Bound to:
  HEAD:   $HEAD_SHA
  Branch: ${BRANCH:-<detached>}

IMPORTANT: This override is only valid for this specific commit.
If you make new commits, you must re-run this script with a new token.

To clear: set-override-token.sh --clear
SUCCESS

exit 0
