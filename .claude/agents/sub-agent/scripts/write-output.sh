#!/bin/bash
#
# write-output.sh — Write subagent JSON output file with schema validation
#
# Usage:
#   write-output.sh '<agent>' \
#     --verdict 'APPROVED|BLOCKED|NEEDS_INPUT|ERROR' \
#     --summary 'Human-readable summary' \
#     [--type 'QA_*'] \
#     [--payload '{"commits":...}'] \
#     [--signature 'hex...'] \
#     [--blockers '["issue1","issue2"]'] \
#     [--questions '["q1","q2"]'] \
#     [--details '{"key":"value"}']
#
# The script constructs valid JSON according to the Phase 1 output schema.
# Field validation ensures correct structure based on verdict.
#
# Note: --type maps to "signature_type" in output (matches sign.sh output format)
#

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# PARSE ARGUMENTS
# ═══════════════════════════════════════════════════════════════════════════════

AGENT="${1:-}"

if [[ -z "$AGENT" ]]; then
	cat >&2 << 'USAGE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  write-output.sh — Write subagent JSON output file                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Usage:
  write-output.sh '<agent>' --verdict <V> --summary <S> [options]

Required:
  <agent>              Agent identifier (e.g., review-claims-auditor)
  --verdict <V>        APPROVED | BLOCKED | NEEDS_INPUT | ERROR
  --summary <S>        Human-readable summary string

Conditional (required for APPROVED):
  --type <T>           Signature type (e.g., QA_CLAIMS_AUDITOR)
  --payload <P>        Signed payload JSON string
  --signature <SIG>    Hex signature from sign.sh

Conditional (required for BLOCKED):
  --blockers <JSON>    JSON array of blocker strings

Conditional (required for NEEDS_INPUT):
  --questions <JSON>   JSON array of question strings

Optional:
  --details <JSON>     Agent-specific metadata object (default: {})

Example (APPROVED):
  write-output.sh 'review-claims-auditor' \
    --verdict 'APPROVED' \
    --summary 'All claims verified' \
    --type 'QA_CLAIMS_AUDITOR' \
    --payload '{"commits":["abc"],...}' \
    --signature 'a1b2c3...' \
    --details '{"risk_tier":"HIGH"}'

Example (BLOCKED):
  write-output.sh 'review-claims-auditor' \
    --verdict 'BLOCKED' \
    --summary 'Claim mismatch found' \
    --blockers '["Claimed refactor but added new feature"]' \
    --details '{"risk_tier":"HIGH"}'
USAGE
	exit 1
fi

shift # Remove agent from args

# Initialize variables
VERDICT=""
SUMMARY=""
SIG_TYPE=""
PAYLOAD=""
SIGNATURE=""
BLOCKERS=""
QUESTIONS=""
DETAILS="{}"

# Parse named arguments
while [[ $# -gt 0 ]]; do
	case "$1" in
		--verdict)
			VERDICT="$2"
			shift 2
			;;
		--summary)
			SUMMARY="$2"
			shift 2
			;;
		--type)
			SIG_TYPE="$2"
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
		--blockers)
			BLOCKERS="$2"
			shift 2
			;;
		--questions)
			QUESTIONS="$2"
			shift 2
			;;
		--details)
			DETAILS="$2"
			shift 2
			;;
		*)
			echo "ERROR: Unknown argument: $1" >&2
			exit 1
			;;
	esac
done

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATE REQUIRED FIELDS
# ═══════════════════════════════════════════════════════════════════════════════

ERRORS=()

if [[ -z "$VERDICT" ]]; then
	ERRORS+=("--verdict is required")
fi

if [[ -z "$SUMMARY" ]]; then
	ERRORS+=("--summary is required")
fi

# Validate verdict value
if [[ -n "$VERDICT" ]] && [[ ! "$VERDICT" =~ ^(APPROVED|BLOCKED|NEEDS_INPUT|ERROR)$ ]]; then
	ERRORS+=("--verdict must be APPROVED, BLOCKED, NEEDS_INPUT, or ERROR (got: $VERDICT)")
fi

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATE CONDITIONAL FIELDS BASED ON VERDICT
# ═══════════════════════════════════════════════════════════════════════════════

if [[ "$VERDICT" == "APPROVED" ]]; then
	if [[ -z "$SIG_TYPE" ]]; then
		ERRORS+=("APPROVED verdict requires --type (signature type)")
	fi
	if [[ -z "$PAYLOAD" ]]; then
		ERRORS+=("APPROVED verdict requires --payload (signed payload)")
	fi
	if [[ -z "$SIGNATURE" ]]; then
		ERRORS+=("APPROVED verdict requires --signature (hex signature)")
	fi
	# Ensure blockers/questions are not set for APPROVED
	if [[ -n "$BLOCKERS" ]]; then
		ERRORS+=("APPROVED verdict must not have --blockers")
	fi
	if [[ -n "$QUESTIONS" ]]; then
		ERRORS+=("APPROVED verdict must not have --questions")
	fi
fi

if [[ "$VERDICT" == "BLOCKED" ]]; then
	if [[ -z "$BLOCKERS" ]]; then
		ERRORS+=("BLOCKED verdict requires --blockers (JSON array)")
	fi
	# Ensure signature fields are not set for BLOCKED
	if [[ -n "$SIG_TYPE" || -n "$PAYLOAD" || -n "$SIGNATURE" ]]; then
		ERRORS+=("BLOCKED verdict must not have signature fields (--type, --payload, --signature)")
	fi
fi

if [[ "$VERDICT" == "NEEDS_INPUT" ]]; then
	if [[ -z "$QUESTIONS" ]]; then
		ERRORS+=("NEEDS_INPUT verdict requires --questions (JSON array)")
	fi
	# Ensure signature fields are not set for NEEDS_INPUT
	if [[ -n "$SIG_TYPE" || -n "$PAYLOAD" || -n "$SIGNATURE" ]]; then
		ERRORS+=("NEEDS_INPUT verdict must not have signature fields")
	fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATE JSON FIELDS
# ═══════════════════════════════════════════════════════════════════════════════

if [[ -n "$BLOCKERS" ]] && ! echo "$BLOCKERS" | jq -e 'type == "array"' >/dev/null 2>&1; then
	ERRORS+=("--blockers must be a valid JSON array")
fi

if [[ -n "$QUESTIONS" ]] && ! echo "$QUESTIONS" | jq -e 'type == "array"' >/dev/null 2>&1; then
	ERRORS+=("--questions must be a valid JSON array")
fi

if ! echo "$DETAILS" | jq -e 'type == "object"' >/dev/null 2>&1; then
	ERRORS+=("--details must be a valid JSON object")
fi

# ═══════════════════════════════════════════════════════════════════════════════
# REPORT ERRORS
# ═══════════════════════════════════════════════════════════════════════════════

if [[ ${#ERRORS[@]} -gt 0 ]]; then
	cat >&2 << 'ERROR_HEADER'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ VALIDATION FAILED                                                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
ERROR_HEADER
	echo "" >&2
	for err in "${ERRORS[@]}"; do
		echo "  • $err" >&2
	done
	echo "" >&2
	echo "Run 'write-output.sh' without arguments to see usage." >&2
	exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CONSTRUCT JSON
# ═══════════════════════════════════════════════════════════════════════════════

# Build JSON using jq for proper escaping
JSON=$(jq -n \
	--arg agent "$AGENT" \
	--arg verdict "$VERDICT" \
	--arg summary "$SUMMARY" \
	--arg sig_type "$SIG_TYPE" \
	--arg payload "$PAYLOAD" \
	--arg signature "$SIGNATURE" \
	--argjson blockers "${BLOCKERS:-null}" \
	--argjson questions "${QUESTIONS:-null}" \
	--argjson details "$DETAILS" \
	'{
		agent: $agent,
		verdict: $verdict,
		summary: $summary,
		signature_type: (if $sig_type == "" then null else $sig_type end),
		payload: (if $payload == "" then null else $payload end),
		signature: (if $signature == "" then null else $signature end),
		blockers: $blockers,
		questions: $questions,
		details: $details
	}'
)

# ═══════════════════════════════════════════════════════════════════════════════
# WRITE OUTPUT FILE
# ═══════════════════════════════════════════════════════════════════════════════

OUTPUT_DIR="/tmp/claude/sub-agents/output"
OUTPUT_FILE="$OUTPUT_DIR/${AGENT}.json"

mkdir -p "$OUTPUT_DIR"
echo "$JSON" > "$OUTPUT_FILE"

echo "✓ Output written to: $OUTPUT_FILE"
