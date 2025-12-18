#!/bin/bash
#
# Mock crypto-gate binary for testing
#
# This mock produces deterministic signatures based on the input payload.
# It allows sign.sh and write-output.sh tests to run without the real crypto-gate binary.
#
# Usage:
#   crypto-gate-mock.sh sign <payload> --type <type>
#   crypto-gate-mock.sh verify --type <type> --payload <payload> --signature <sig>
#
# Sign output: 64-character hex string (sha256 of payload+type)
# Verify output: "valid" or "invalid"
#

set -euo pipefail

COMMAND="${1:-}"
shift 1 2>/dev/null || true

TYPE=""
PAYLOAD=""
SIGNATURE=""

# Parse arguments based on command
if [[ "$COMMAND" == "sign" ]]; then
	PAYLOAD="${1:-}"
	shift 1 2>/dev/null || true
fi

while [[ $# -gt 0 ]]; do
	case "$1" in
		--type)
			TYPE="$2"
			shift 2
			;;
		--payload)
			PAYLOAD="$2"
			shift 2
			;;
		--signature)
			SIGNATURE="$2"
			shift 2
			;;
		*)
			shift
			;;
	esac
done

case "$COMMAND" in
	sign)
		if [[ -z "$PAYLOAD" ]]; then
			echo "ERROR: Payload required" >&2
			exit 1
		fi
		# Produce deterministic signature: sha256 of payload+type
		echo -n "${PAYLOAD}${TYPE}" | sha256sum | cut -d' ' -f1
		;;
	verify)
		if [[ -z "$PAYLOAD" || -z "$SIGNATURE" || -z "$TYPE" ]]; then
			echo "ERROR: --payload, --signature, and --type required for verify" >&2
			exit 1
		fi
		# Compute expected signature and compare
		EXPECTED=$(echo -n "${PAYLOAD}${TYPE}" | sha256sum | cut -d' ' -f1)
		if [[ "$SIGNATURE" == "$EXPECTED" ]]; then
			echo "valid"
		else
			echo "invalid"
			exit 1
		fi
		;;
	*)
		echo "ERROR: Unknown command: $COMMAND" >&2
		exit 1
		;;
esac
