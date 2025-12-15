#!/bin/bash
#
# verify.sh — Verify cryptographic signature on QA approval payload
#
# Usage:
#   verify.sh '<payload-json>' '<signature>'
#
# Returns:
#   0 if signature is valid and verdict is APPROVED
#   1 if verification fails
#
# This script is shared by:
#   - pusher sub-agent (verify-and-push.sh) — verifies before push
#   - code-reviewer sub-agent — verifies prior approval for incremental review
#

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# DETERMINE PROJECT ROOT
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../../../.." && pwd)}"

# ═══════════════════════════════════════════════════════════════════════════════
# LOCATE CRYPTO-GATE BINARY
# ═══════════════════════════════════════════════════════════════════════════════

find_crypto_gate() {
	local WRAPPER="$CLAUDE_PROJECT_DIR/bin/crypto-gate"

	if [[ -x "$WRAPPER" ]]; then
		echo "$WRAPPER"
		return 0
	fi

	cat >&2 << 'NO_BINARY'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ CRYPTO-GATE NOT FOUND                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The crypto-gate wrapper script is not found or not executable.

Expected: $CLAUDE_PROJECT_DIR/bin/crypto-gate

The crypto-gate binary should be downloaded by SubagentStart hook.
NO_BINARY
	return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# PARSE ARGUMENTS
# ═══════════════════════════════════════════════════════════════════════════════

PAYLOAD="${1:-}"
SIGNATURE="${2:-}"

if [[ -z "$PAYLOAD" || -z "$SIGNATURE" ]]; then
	cat >&2 << 'USAGE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ USAGE ERROR — Missing required arguments                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Usage: verify.sh '<payload-json>' '<signature>'

Arguments:
  payload    JSON string containing approval data (commits, verdict, etc.)
  signature  HMAC-SHA256 signature from crypto-gate

Example:
  verify-approval.sh '{"commits":["abc123"],"verdict":"APPROVED"}' 'a1b2c3...'
USAGE
	exit 1
fi

CRYPTO_GATE=$(find_crypto_gate) || exit 1

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY SIGNATURE VIA CRYPTO-GATE
# ═══════════════════════════════════════════════════════════════════════════════

if ! "$CRYPTO_GATE" verify "$PAYLOAD" "$SIGNATURE" 2>/dev/null; then
	echo "❌ Signature verification failed" >&2
	exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY VERDICT IS APPROVED
# ═══════════════════════════════════════════════════════════════════════════════

VERDICT=$(echo "$PAYLOAD" | jq -r '.verdict // empty' 2>/dev/null)

if [[ "$VERDICT" != "APPROVED" ]]; then
	echo "❌ Verdict is not APPROVED (got: ${VERDICT:-<missing>})" >&2
	exit 1
fi

# Success - signature valid and verdict is APPROVED
exit 0
