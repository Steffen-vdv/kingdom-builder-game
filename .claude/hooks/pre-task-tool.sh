#!/bin/bash
# PreToolUse hook for Task - validates and prepares QA workflow
#
# Phase 1 reviewers: review-ci-tests-required + 5 specialist reviewers
# Phase 2 reviewer: review-lead (aggregates Phase 1)
#
# This hook:
#   1. Blocks model overrides for QA subagents
#   2. Writes canonical input to /tmp/claude/qa/current/input.json
#   3. Computes delta review info for Phase 1 reviewers
#   4. Gates review-lead by verifying all 6 Phase 1 outputs
#
# Note: safe-deployment-gate removed from QA pipeline (script-only now)

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
