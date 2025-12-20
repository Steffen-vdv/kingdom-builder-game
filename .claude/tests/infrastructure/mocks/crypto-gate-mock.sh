#!/bin/bash
#
# Mock crypto-gate binary for testing
#
# This mock produces deterministic signatures based on the input payload.
# It allows sign.sh and write-output.sh tests to run without the real crypto-gate binary.
#
# Usage (matches real crypto-gate binary interface):
#   crypto-gate-mock.sh sign <payload> --type <type>
#   crypto-gate-mock.sh verify <payload> <sig> --type <type>
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

# Parse positional arguments based on command
if [[ "$COMMAND" == "sign" ]]; then
	# sign <payload> --type <type>
	PAYLOAD="${1:-}"
	shift 1 2>/dev/null || true
elif [[ "$COMMAND" == "verify" ]]; then
	# verify <payload> <sig> --type <type>
	PAYLOAD="${1:-}"
	SIGNATURE="${2:-}"
	shift 2 2>/dev/null || true
fi

# Parse remaining named arguments (--type)
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
			echo "ERROR: verify requires <payload> <sig> --type <type>" >&2
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
	verify-override)
		# For testing: accept any token except "MOCK_INVALID_TOKEN"
		TOKEN="${PAYLOAD:-$1}"
		if [[ -z "$TOKEN" ]]; then
			echo "ERROR: verify-override requires <token>" >&2
			exit 1
		fi
		if [[ "$TOKEN" == "MOCK_INVALID_TOKEN" ]]; then
			echo "invalid"
			exit 1
		fi
		echo "valid"
		;;
	*)
		echo "ERROR: Unknown command: $COMMAND" >&2
		exit 1
		;;
esac
