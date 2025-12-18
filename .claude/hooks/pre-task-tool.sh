#!/bin/bash
# PreToolUse hook for Task - validates and prepares QA workflow
#
# Phase 1 reviewers: review-ci-tests-required + 5 specialist reviewers
# Phase 2 reviewer: review-lead (aggregates Phase 1)
# Phase 3: qa-verified-push (hook-driven push, no subagent work)
#
# This hook:
#   1. Blocks model overrides for QA subagents
#   2. Writes canonical input to /tmp/claude/qa/current/input.json
#   3. Computes delta review info for Phase 1 reviewers
#   4. Gates review-lead by verifying all 6 Phase 1 outputs
#   5. For qa-verified-push: verifies review-lead signature and performs git push

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
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry|review-lead)
		if [[ -n "$MODEL_OVERRIDE" ]]; then
			cat << EOF
{"decision":"block","reason":"Model override '$MODEL_OVERRIDE' not allowed for $SUBAGENT. These subagents have model configured in frontmatter. Remove the 'model' parameter from your Task invocation."}
EOF
			exit 1
		fi
		;;
esac

# =============================================================================
# PHASE 3: HOOK-DRIVEN VERIFIED PUSH
# =============================================================================
# qa-verified-push is a special subagent where ALL work happens in this hook.
# The hook verifies the review-lead signature and performs git push.
# The subagent itself just reports success (no tools needed).

if [[ "$SUBAGENT" == "qa-verified-push" ]]; then
	log_hook "qa-verified-push" "Starting verification and push"

	# Read review-lead output
	REVIEW_LEAD_FILE="$QA_OUTPUT_DIR/review-lead.json"
	if [[ ! -f "$REVIEW_LEAD_FILE" ]]; then
		cat << EOF
{"decision":"block","reason":"Missing review-lead.json. Run Phase 2 (review-lead) first."}
EOF
		exit 1
	fi

	# Extract and verify fields
	VERDICT=$(jq -r '.verdict // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	PAYLOAD=$(jq -r '.payload // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	SIGNATURE=$(jq -r '.signature // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	SIG_TYPE=$(jq -r '.signature_type // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")

	if [[ "$VERDICT" != "APPROVED" ]]; then
		cat << EOF
{"decision":"block","reason":"Review-lead verdict is not APPROVED: $VERDICT. Cannot push without approval."}
EOF
		exit 1
	fi

	if [[ -z "$PAYLOAD" || -z "$SIGNATURE" || "$SIG_TYPE" != "QA_FINAL_SIGNATORY" ]]; then
		cat << EOF
{"decision":"block","reason":"Review-lead output missing valid signature fields."}
EOF
		exit 1
	fi

	# Verify signature
	if ! qa_verify_payload_signature "$PAYLOAD" "$SIGNATURE" "$SIG_TYPE"; then
		cat << EOF
{"decision":"block","reason":"Review-lead signature verification failed."}
EOF
		exit 1
	fi

	# Verify input hash matches current canonical input
	CURRENT_INPUT_HASH=$(cat "$QA_CURRENT_DIR/input.sha256" 2>/dev/null || echo "")
	PAYLOAD_INPUT_HASH=$(jq -r '.payload_json.input_hash // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")

	if [[ -z "$CURRENT_INPUT_HASH" || "$PAYLOAD_INPUT_HASH" != "$CURRENT_INPUT_HASH" ]]; then
		cat << EOF
{"decision":"block","reason":"Input hash mismatch. Review may be stale. Re-run QA workflow."}
EOF
		exit 1
	fi

	# Get branch from canonical input
	BRANCH=$(jq -r '.branch // ""' "$QA_CURRENT_DIR/input.json" 2>/dev/null || echo "")
	if [[ -z "$BRANCH" ]]; then
		cat << EOF
{"decision":"block","reason":"Cannot determine branch from canonical input."}
EOF
		exit 1
	fi

	log_hook "qa-verified-push" "Verification passed, pushing to $BRANCH"

	# Perform the push (hook context can execute git push)
	cd "$CLAUDE_PROJECT_DIR"
	PUSH_OUTPUT=""
	if PUSH_OUTPUT=$(git push -u origin "$BRANCH" 2>&1); then
		log_hook "qa-verified-push" "Push successful"

		# Cleanup QA outputs
		rm -f "$QA_OUTPUT_DIR"/*.json 2>/dev/null || true
		rm -f "$QA_CURRENT_DIR/input.json" 2>/dev/null || true
		rm -f "$QA_CURRENT_DIR/input.sha256" 2>/dev/null || true
		rm -rf "$QA_CURRENT_DIR/delta" 2>/dev/null || true

		# Write success marker for subagent to read
		echo '{"status":"success","branch":"'"$BRANCH"'"}' > "$QA_OUTPUT_DIR/push-result.json"

		# Allow subagent to run (it just reports success)
		exit 0
	else
		log_hook "qa-verified-push" "Push failed: $PUSH_OUTPUT"
		cat << EOF
{"decision":"block","reason":"Git push failed: $PUSH_OUTPUT"}
EOF
		exit 1
	fi
fi

# =============================================================================
# CHECK IF THIS IS A QA SUBAGENT
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
