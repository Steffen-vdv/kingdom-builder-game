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

# Source the canonical agent registry for validation
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../../shared/config/agent-registry.sh"

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
  --type <T>           Signature type (e.g., QA_CLAIMS_AUDITOR)
  --payload <P>        Signed payload JSON string from sign.sh
  --signature <SIG>    Hex signature from sign.sh

Conditional:
  --blockers <JSON>    JSON array of blockers (required for BLOCKED)
  --questions <JSON>   JSON array of questions (required for NEEDS_INPUT)

Optional:
  --details <JSON>     Agent-specific metadata object (default: {})

NOTE: All verdicts must be signed to enable delta review in subsequent rounds.

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
    --type 'QA_CLAIMS_AUDITOR' \
    --payload '{"commits":["abc"],"verdict":"BLOCKED","blockers":[...]}' \
    --signature 'a1b2c3...' \
    --blockers '["Claimed refactor but added new feature"]'
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
# VALIDATE AGENT IDENTIFIER (using VALID_AGENTS and AGENT_SIG_TYPES from agent-registry.sh)
# ═══════════════════════════════════════════════════════════════════════════════

if [[ ! "$AGENT" =~ ^($VALID_AGENTS)$ ]]; then
	cat >&2 << EOF
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ INVALID AGENT IDENTIFIER                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Provided: $AGENT

Valid agent identifiers:
  • review-ci-tests-required
  • review-claims-auditor
  • review-contracts-boundaries
  • review-mechanics-content
  • review-infra-concurrency
  • review-tests-docs-dry
  • review-lead

Note: safe-deployment-gate does not write JSON output (communicates via exit code).
The agent identifier must match exactly — check for typos.
EOF
	exit 1
fi

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

# All verdicts require signature fields (enables delta review in subsequent rounds)
if [[ -z "$SIG_TYPE" ]]; then
	ERRORS+=("--type (signature type) is required for all verdicts")
fi
if [[ -z "$PAYLOAD" ]]; then
	ERRORS+=("--payload (signed payload) is required for all verdicts")
fi
if [[ -z "$SIGNATURE" ]]; then
	ERRORS+=("--signature (hex signature) is required for all verdicts")
fi

# Cross-validate agent identifier matches signature type (prevents copy/paste errors)
if [[ -n "$SIG_TYPE" ]]; then
	EXPECTED_SIG_TYPE="${AGENT_SIG_TYPES[$AGENT]}"
	if [[ "$SIG_TYPE" != "$EXPECTED_SIG_TYPE" ]]; then
		ERRORS+=("Agent '$AGENT' must use signature type '$EXPECTED_SIG_TYPE', not '$SIG_TYPE'")
	fi
fi

# Validate signature format (64 hex characters)
if [[ -n "$SIGNATURE" && ! "$SIGNATURE" =~ ^[a-f0-9]{64}$ ]]; then
	ERRORS+=("--signature must be 64 hex characters (got ${#SIGNATURE} chars)")
fi

# Verdict-specific field requirements
if [[ "$VERDICT" == "APPROVED" ]]; then
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
fi

if [[ "$VERDICT" == "NEEDS_INPUT" ]]; then
	if [[ -z "$QUESTIONS" ]]; then
		ERRORS+=("NEEDS_INPUT verdict requires --questions (JSON array)")
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
# CRYPTOGRAPHIC SIGNATURE VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

# Only verify if we have all required signing fields (skip if already has errors)
if [[ ${#ERRORS[@]} -eq 0 && -n "$PAYLOAD" && -n "$SIGNATURE" && -n "$SIG_TYPE" ]]; then
	# Locate crypto-gate
	PROJECT_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
	CRYPTO_GATE="$PROJECT_DIR/bin/crypto-gate"

	if [[ ! -x "$CRYPTO_GATE" ]]; then
		ERRORS+=("crypto-gate not found at $CRYPTO_GATE - cannot verify signature")
	else
		# Verify the signature matches the payload
		# crypto-gate verify uses positional args: verify <payload> <sig> --type <t>
		VERIFY_RESULT=$("$CRYPTO_GATE" verify "$PAYLOAD" "$SIGNATURE" --type "$SIG_TYPE" 2>&1) || true

		if [[ "$VERIFY_RESULT" != "valid" ]]; then
			cat >&2 << 'SIG_ERROR_HEADER'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ SIGNATURE VERIFICATION FAILED                                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The signature does not cryptographically verify against the payload.
This means the payload was NOT signed by crypto-gate with this signature.

SIG_ERROR_HEADER
			cat >&2 << EOF
COMMON CAUSES:
  1. You manually constructed the payload instead of using sign.sh output
  2. You modified the payload after calling sign.sh
  3. You passed a different payload to write-output.sh than what was signed
  4. You fabricated or copied a signature from elsewhere

CORRECT WORKFLOW:
  # Step 1: Call sign.sh and capture its output
  SIGN_OUTPUT=\`sign.sh '<summary>' '$SIG_TYPE'\`

  # Step 2: Extract payload and signature from sign.sh output
  PAYLOAD=\`echo "\$SIGN_OUTPUT" | jq -r '.payload'\`
  SIGNATURE=\`echo "\$SIGN_OUTPUT" | jq -r '.signature'\`

  # Step 3: Pass EXACTLY those values to write-output.sh
  write-output.sh '$AGENT' --payload "\$PAYLOAD" --signature "\$SIGNATURE" ...

The payload from sign.sh is the ONLY payload that will verify.
Do NOT construct your own payload or add extra fields.

PROVIDED VALUES:
  Signature type: $SIG_TYPE
  Signature: $SIGNATURE
  Payload (first 200 chars): ${PAYLOAD:0:200}...
EOF
			exit 1
		fi
	fi
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
