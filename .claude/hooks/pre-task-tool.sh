#!/bin/bash
# PreToolUse hook for Task - validates and prepares QA workflow
#
# Phase 1 reviewers: review-ci-tests-required + 5 specialist reviewers
# Phase 2 reviewer: review-lead (aggregates Phase 1)
# Phase 3: safe-deployment-gate (subagent runs verify-and-push.sh)
#
# This hook:
#   1. Blocks model overrides for QA subagents
#   2. Writes canonical input to /tmp/claude/qa/current/input.json
#   3. Computes delta review info for Phase 1 reviewers
#   4. Gates review-lead by verifying all 6 Phase 1 outputs
#   5. Gates safe-deployment-gate by verifying review-lead signature

source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/qa-hook-lib.sh"

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')
MODEL_OVERRIDE=$(echo "$INPUT" | jq -r '.tool_input.model // ""')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# =============================================================================
# BLOCK MODEL OVERRIDES for QA subagents
# =============================================================================
# These subagents have model configured in frontmatter. Overriding degrades
# reliability (e.g., haiku may skip tool invocations and output narrative).

case "$SUBAGENT" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry|review-lead|safe-deployment-gate)
		if [[ -n "$MODEL_OVERRIDE" ]]; then
			cat << EOF
{"decision":"block","reason":"Model override '$MODEL_OVERRIDE' not allowed for $SUBAGENT. These subagents have model configured in frontmatter. Remove the 'model' parameter from your Task invocation."}
EOF
			exit 1
		fi
		;;
esac

# =============================================================================
# PHASE 3: SAFE-DEPLOYMENT-GATE GATING
# =============================================================================
# Verify review-lead signature before allowing safe-deployment-gate to run.
# The actual push is performed by the subagent via verify-and-push.sh.
# Exception: Override mode bypasses all checks (token verified by crypto-gate).

if [[ "$SUBAGENT" == "safe-deployment-gate" ]]; then
	log_hook "safe-deployment-gate" "Gating check started"

	# Check for override mode - if override_token present, allow through
	# The subagent will run verify-and-push.sh --override which verifies the token
	OVERRIDE_TOKEN=""
	if echo "$PROMPT" | jq -e '.' >/dev/null 2>&1; then
		OVERRIDE_TOKEN=$(echo "$PROMPT" | jq -r '.override_token // ""' 2>/dev/null || echo "")
	fi

	if [[ -n "$OVERRIDE_TOKEN" ]]; then
		log_hook "safe-deployment-gate" "Override mode detected, allowing subagent"
		exit 0
	fi

	# Normal QA mode - verify review-lead.json
	# Check 1: review-lead.json must exist
	REVIEW_LEAD_FILE="$QA_OUTPUT_DIR/review-lead.json"
	if [[ ! -f "$REVIEW_LEAD_FILE" ]]; then
		cat << EOF
{"decision":"block","reason":"Missing review-lead.json. Run Phase 2 (review-lead) before Phase 3."}
EOF
		exit 1
	fi

	# Check 2: Extract required fields
	VERDICT=$(jq -r '.verdict // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	PAYLOAD=$(jq -r '.payload // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	SIGNATURE=$(jq -r '.signature // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	SIG_TYPE=$(jq -r '.signature_type // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")

	# Check 3: Signature type must be QA_FINAL_SIGNATORY
	if [[ "$SIG_TYPE" != "QA_FINAL_SIGNATORY" ]]; then
		cat << EOF
{"decision":"block","reason":"Review-lead signature_type is '$SIG_TYPE', expected 'QA_FINAL_SIGNATORY'."}
EOF
		exit 1
	fi

	# Check 4: Payload and signature must exist
	if [[ -z "$PAYLOAD" || -z "$SIGNATURE" ]]; then
		cat << EOF
{"decision":"block","reason":"Review-lead output missing payload or signature."}
EOF
		exit 1
	fi

	# Check 5: Verdict must be APPROVED
	if [[ "$VERDICT" != "APPROVED" ]]; then
		cat << EOF
{"decision":"block","reason":"Review-lead verdict is '$VERDICT', expected 'APPROVED'. Cannot push without approval."}
EOF
		exit 1
	fi

	# Check 6: Verify signature via crypto-gate
	if ! qa_verify_payload_signature "$PAYLOAD" "$SIGNATURE" "$SIG_TYPE"; then
		cat << EOF
{"decision":"block","reason":"Review-lead signature verification failed via crypto-gate."}
EOF
		exit 1
	fi

	# Check 7: Verify input hash matches current canonical input
	CURRENT_INPUT_HASH=""
	if [[ -f "$QA_CURRENT_DIR/input.sha256" ]]; then
		CURRENT_INPUT_HASH=$(cat "$QA_CURRENT_DIR/input.sha256")
	fi

	# Extract input_hash from payload_json (the pre-parsed object in the output file)
	PAYLOAD_INPUT_HASH=$(jq -r '.payload_json.input_hash // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")

	if [[ -z "$CURRENT_INPUT_HASH" ]]; then
		cat << EOF
{"decision":"block","reason":"Missing canonical input.sha256. Re-run QA workflow from Phase 1."}
EOF
		exit 1
	fi

	if [[ "$PAYLOAD_INPUT_HASH" != "$CURRENT_INPUT_HASH" ]]; then
		cat << EOF
{"decision":"block","reason":"Input hash mismatch. Signed hash: '$PAYLOAD_INPUT_HASH', current: '$CURRENT_INPUT_HASH'. Review may be stale."}
EOF
		exit 1
	fi

	# Check 8: Verify HEAD matches what was signed (optional but recommended)
	CURRENT_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "")
	INPUT_HEAD=$(jq -r '.head // ""' "$QA_CURRENT_DIR/input.json" 2>/dev/null || echo "")

	if [[ -n "$INPUT_HEAD" && "$CURRENT_HEAD" != "$INPUT_HEAD" ]]; then
		cat << EOF
{"decision":"block","reason":"HEAD mismatch. Signed HEAD: '$INPUT_HEAD', current: '$CURRENT_HEAD'. New commits added after review."}
EOF
		exit 1
	fi

	log_hook "safe-deployment-gate" "All gating checks passed, allowing subagent to run"
	exit 0
fi

# =============================================================================
# CHECK IF THIS IS A QA SUBAGENT (Phase 1 or Phase 2)
# =============================================================================

if ! qa_is_qa_agent "$SUBAGENT"; then
	# Not a tracked subagent, allow silently
	exit 0
fi

log_hook "$SUBAGENT" "Starting (pre-task)"

# =============================================================================
# INITIALIZE PATHS AND WRITE CANONICAL INPUT
# =============================================================================

qa_paths_init

# Write canonical input (this becomes the source of truth for what's being reviewed)
qa_write_canonical_input "$SESSION_ID" "$PROMPT" "$SUBAGENT"

# =============================================================================
# DELTA LOGIC FOR PHASE 1 REVIEWERS
# =============================================================================

if qa_is_phase1_reviewer "$SUBAGENT"; then
	# Read commits from canonical input
	CURRENT_COMMITS=$(jq -c '.commits' "$QA_CURRENT_DIR/input.json" 2>/dev/null || echo '[]')

	# Compute delta and write to delta file
	MODE=$(qa_compute_delta "$SUBAGENT" "$CURRENT_COMMITS")

	log_hook "$SUBAGENT" "Delta mode: $MODE"
fi

# =============================================================================
# GATING FOR REVIEW-LEAD (PHASE 2)
# =============================================================================

if qa_is_review_lead "$SUBAGENT"; then
	log_hook "review-lead" "Validating Phase 1 outputs"

	# Validate all 6 Phase 1 output files
	ERROR_MSG=""
	if ! ERROR_MSG=$(qa_validate_phase1_outputs 2>&1); then
		cat << EOF
{"decision":"block","reason":"Phase 1 validation failed: $ERROR_MSG"}
EOF
		exit 1
	fi

	log_hook "review-lead" "Phase 1 validation passed"
fi

# All checks passed
exit 0
