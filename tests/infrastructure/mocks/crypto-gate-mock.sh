#!/bin/bash
#
# Mock crypto-gate binary for testing
#
# This mock produces deterministic signatures based on the input payload.
# It allows sign.sh tests to run without the real crypto-gate binary.
#
# Usage: crypto-gate-mock.sh sign <payload> --type <type>
#
# Output: 64-character hex string (sha256 of payload+type)
#

set -euo pipefail

COMMAND="${1:-}"
PAYLOAD="${2:-}"
TYPE=""

# Parse arguments
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
	case "$1" in
		--type)
			TYPE="$2"
			shift 2
			;;
		*)
			shift
			;;
	esac
done

if [[ "$COMMAND" != "sign" ]]; then
	echo "ERROR: Unknown command: $COMMAND" >&2
	exit 1
fi

if [[ -z "$PAYLOAD" ]]; then
	echo "ERROR: Payload required" >&2
	exit 1
fi

# Produce deterministic signature: sha256 of payload+type
# This allows tests to verify signature consistency
echo -n "${PAYLOAD}${TYPE}" | sha256sum | cut -d' ' -f1
