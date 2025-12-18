#!/bin/bash
#
# sign.sh — Sign QA verdict for workflow state tracking
#
# Usage: sign.sh '<summary>' '<signature_type>' [options]
#
# Options:
#   --verdict <V>      APPROVED|BLOCKED|NEEDS_INPUT (default: APPROVED)
#   --blockers <JSON>  JSON array of blockers (for BLOCKED verdict)
#   --questions <JSON> JSON array of questions (for NEEDS_INPUT verdict)
#
# Gathers commit info, creates payload, signs via crypto-gate,
# and outputs structured JSON for downstream verification.
#
# Called by QA reviewers after determining their verdict.
# All verdicts are signed to enable delta review in subsequent rounds.
#

set -euo pipefail

SUMMARY="${1:-}"
SIG_TYPE="${2:-}"
shift 2 2>/dev/null || true

# Parse optional arguments
VERDICT="APPROVED"
BLOCKERS=""
QUESTIONS=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--verdict)
			VERDICT="$2"
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
		*)
			echo "ERROR: Unknown argument: $1" >&2
			exit 1
			;;
	esac
done

if [[ -z "$SUMMARY" || -z "$SIG_TYPE" ]]; then
	cat >&2 << 'USAGE'
Usage: sign.sh '<summary>' '<signature_type>' [options]

Options:
  --verdict <V>      APPROVED|BLOCKED|NEEDS_INPUT (default: APPROVED)
  --blockers <JSON>  JSON array (required for BLOCKED)
  --questions <JSON> JSON array (required for NEEDS_INPUT)

Valid signature types:
  QA_FINAL_SIGNATORY, QA_CI_REQUIRED_TESTS, QA_CLAIMS_AUDITOR,
  QA_CONTRACTS_BOUNDARIES, QA_MECHANICS_CONTENT,
  QA_INFRA_CONCURRENCY, QA_TESTS_DOCS_DRY
USAGE
	exit 1
fi

# Validate signature type is one of the known types
VALID_SIG_TYPES="QA_FINAL_SIGNATORY|QA_CI_REQUIRED_TESTS|QA_CLAIMS_AUDITOR|QA_CONTRACTS_BOUNDARIES|QA_MECHANICS_CONTENT|QA_INFRA_CONCURRENCY|QA_TESTS_DOCS_DRY"
if [[ ! "$SIG_TYPE" =~ ^($VALID_SIG_TYPES)$ ]]; then
	cat >&2 << EOF
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ INVALID SIGNATURE TYPE                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Provided: $SIG_TYPE

Valid signature types:
  • QA_FINAL_SIGNATORY      (review-lead only)
  • QA_CI_REQUIRED_TESTS    (review-ci-tests-required)
  • QA_CLAIMS_AUDITOR       (review-claims-auditor)
  • QA_CONTRACTS_BOUNDARIES (review-contracts-boundaries)
  • QA_MECHANICS_CONTENT    (review-mechanics-content)
  • QA_INFRA_CONCURRENCY    (review-infra-concurrency)
  • QA_TESTS_DOCS_DRY       (review-tests-docs-dry)

Each agent MUST use its designated signature type. See:
.claude/agents/sub-agent/docs/cryptographic-signing.md
EOF
	exit 1
fi

# Validate verdict
if [[ ! "$VERDICT" =~ ^(APPROVED|BLOCKED|NEEDS_INPUT)$ ]]; then
	echo "ERROR: --verdict must be APPROVED, BLOCKED, or NEEDS_INPUT" >&2
	exit 1
fi

# Validate conditional fields
if [[ "$VERDICT" == "BLOCKED" && -z "$BLOCKERS" ]]; then
	echo "ERROR: BLOCKED verdict requires --blockers" >&2
	exit 1
fi
if [[ "$VERDICT" == "NEEDS_INPUT" && -z "$QUESTIONS" ]]; then
	echo "ERROR: NEEDS_INPUT verdict requires --questions" >&2
	exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# LOCATE CRYPTO-GATE
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CRYPTO_GATE="$PROJECT_DIR/bin/crypto-gate"

if [[ ! -x "$CRYPTO_GATE" ]]; then
	cat >&2 << EOF
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ CRYPTO-GATE NOT FOUND                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Expected: $CRYPTO_GATE

The crypto-gate binary should be downloaded by master-agent at session start.
If you are a subagent and see this, report ERROR to the master-agent.
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

# Build payload using jq for proper escaping
PAYLOAD=$(jq -n -c \
	--arg commits "$HEAD_SHA" \
	--arg diffHash "$DIFF_HASH" \
	--arg verdict "$VERDICT" \
	--arg summary "$SUMMARY" \
	--arg timestamp "$TIMESTAMP" \
	--argjson blockers "${BLOCKERS:-null}" \
	--argjson questions "${QUESTIONS:-null}" \
	'{
		commits: [$commits],
		diffHash: $diffHash,
		verdict: $verdict,
		summary: $summary,
		timestamp: $timestamp
	}
	+ (if $blockers != null then {blockers: $blockers} else {} end)
	+ (if $questions != null then {questions: $questions} else {} end)'
)

# Sign via crypto-gate CLI with signature type
# crypto-gate sign outputs just the hex signature
SIGNATURE=$("$CRYPTO_GATE" sign "$PAYLOAD" --type "$SIG_TYPE" 2>&1)

if [[ $? -ne 0 ]]; then
	cat >&2 << EOF
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ CRYPTO-GATE SIGNING FAILED                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Signature type: $SIG_TYPE
Verdict: $VERDICT
Payload length: ${#PAYLOAD} bytes

crypto-gate output:
$SIGNATURE

COMMON CAUSES:
  • Invalid signature type (verify against Signature Type Registry)
  • crypto-gate binary corrupted (ask master-agent to re-download)
  • Payload encoding issue (check for special characters in summary)

If this persists, report ERROR to the master-agent with this full message.
EOF
	exit 1
fi

# Validate signature looks like hex
if [[ ! "$SIGNATURE" =~ ^[a-f0-9]{64}$ ]]; then
	echo "ERROR: Invalid signature format: $SIGNATURE" >&2
	exit 1
fi

# Output JSON with payload, signature, and type
# Use jq for proper escaping
jq -n -c \
	--arg payload "$PAYLOAD" \
	--arg signature "$SIGNATURE" \
	--arg type "$SIG_TYPE" \
	'{payload: $payload, signature: $signature, type: $type}'
