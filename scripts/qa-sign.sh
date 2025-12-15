#!/bin/bash
#
# qa-sign.sh — Sign QA approval for verified push
#
# Usage: qa-sign.sh '<summary>'
#
# Gathers commit info, creates payload, signs via crypto-gate,
# and outputs structured JSON for the pusher subagent.
#
# Called by code-reviewer after APPROVED verdict.
#

set -euo pipefail

SUMMARY="${1:-QA approved}"

# ═══════════════════════════════════════════════════════════════════════════════
# LOCATE CRYPTO-GATE
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CRYPTO_GATE="$PROJECT_DIR/bin/crypto-gate"

if [[ ! -x "$CRYPTO_GATE" ]]; then
	cat >&2 << EOF
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ CRYPTO-GATE NOT FOUND                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Expected: $CRYPTO_GATE

Run .claude/session-start.sh to download the binary.
EOF
	exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# GATHER SIGNING DATA
# ═══════════════════════════════════════════════════════════════════════════════

cd "$PROJECT_DIR"

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
if [[ -z "$HEAD_SHA" ]]; then
	echo "ERROR: Failed to get HEAD commit SHA" >&2
	exit 1
fi

# Get diff hash - try origin/main first, fall back to just HEAD
if git rev-parse --verify origin/main >/dev/null 2>&1; then
	DIFF_HASH=$(git diff origin/main...HEAD | sha256sum | cut -d' ' -f1)
else
	# No origin/main, hash the current commit's diff
	DIFF_HASH=$(git show --format= HEAD | sha256sum | cut -d' ' -f1)
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ═══════════════════════════════════════════════════════════════════════════════
# CREATE PAYLOAD AND SIGN
# ═══════════════════════════════════════════════════════════════════════════════

# Escape summary for JSON (basic escaping)
ESCAPED_SUMMARY=$(echo "$SUMMARY" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\n/\\n/g')

PAYLOAD="{\"commits\":[\"$HEAD_SHA\"],\"diffHash\":\"$DIFF_HASH\",\"verdict\":\"APPROVED\",\"summary\":\"$ESCAPED_SUMMARY\",\"timestamp\":\"$TIMESTAMP\"}"

# Sign via crypto-gate CLI
# crypto-gate sign outputs: {"payload":"...","signature":"..."}
RESULT=$("$CRYPTO_GATE" sign "$PAYLOAD" 2>&1)

if [[ $? -ne 0 ]]; then
	echo "ERROR: crypto-gate signing failed: $RESULT" >&2
	exit 1
fi

# Output the result (JSON with payload and signature)
echo "$RESULT"
