#!/bin/bash
#
# set-override-token.sh — Store user-provided override token for expedited push
#
# Usage:
#   set-override-token.sh '<token>'
#   set-override-token.sh --clear
#
# This script stores the override token in a file that the pre-task hook and
# safe-deployment-gate will read. This allows the master agent to receive an
# override token from the user once and use it for the push without including
# it in the Task prompt.
#
# Token file location:
#   /tmp/claude/qa/current/override-token
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
The token is verified via crypto-gate before being stored.

Token file: /tmp/claude/qa/current/override-token

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

# Ensure directory exists
mkdir -p "$QA_CURRENT_DIR"

# Store token (readable only by owner)
echo "$TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

cat << 'SUCCESS'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ✅ OVERRIDE TOKEN STORED                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Token verified and stored at: /tmp/claude/qa/current/override-token

You can now run safe-deployment-gate without including the token in the prompt.
The pre-task hook will automatically read the token from the file.

To clear: set-override-token.sh --clear
SUCCESS

exit 0
