#!/bin/bash
#
# qa-context-builder.sh - Build QA context for injection into subagent prompts
#
# This library provides the build_qa_context function which generates
# the same context that SubagentStart would inject (if SDK supported it).
#
# Usage:
#   source "$CLAUDE_PROJECT_DIR/.claude/hooks/lib/qa-context-builder.sh"
#   context=$(build_qa_context "$agent_type")
#

# Paths (use same as qa-hook-lib.sh)
QA_CURRENT_DIR="${QA_CURRENT_DIR:-/tmp/claude/qa/current}"
QA_OUTPUT_DIR="${QA_OUTPUT_DIR:-/tmp/claude/sub-agents/output}"

# build_qa_context(agent_type) -> outputs context string for injection
build_qa_context() {
	local agent="$1"
	local context=""

	local SHARED_CONTEXT_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/sub-agent/docs/shared-context.md"

	case "$agent" in
		review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|\
		review-mechanics-content|review-infra-concurrency|review-tests-docs-dry)
			# Phase 1 reviewers
			if [[ -f "$SHARED_CONTEXT_DOC" ]]; then
				context+=$(cat "$SHARED_CONTEXT_DOC")
				context+=$'\n\n---\n\n'
			fi

			context+="=== QA Phase 1 Reviewer Context ==="
			context+=$'\n\n'

			# Canonical input
			context+="## Canonical Input (input.json)"
			context+=$'\n\n'
			if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
				context+='```json'$'\n'
				context+=$(cat "$QA_CURRENT_DIR/input.json")
				context+=$'\n```\n\n'
			else
				context+="WARNING: input.json not found at $QA_CURRENT_DIR/input.json"
				context+=$'\n\n'
			fi

			# Delta file
			local DELTA_FILE="$QA_CURRENT_DIR/delta/${agent}.json"
			context+="## Delta Review Info (delta/${agent}.json)"
			context+=$'\n\n'
			if [[ -f "$DELTA_FILE" ]]; then
				context+='```json'$'\n'
				context+=$(cat "$DELTA_FILE")
				context+=$'\n```\n\n'
				context+="**Interpretation:**"$'\n'
				local MODE
				MODE=$(jq -r '.mode // ""' "$DELTA_FILE" 2>/dev/null || echo "")
				if [[ "$MODE" == "DELTA_REVIEW" ]]; then
					local PRIOR_VERDICT
					PRIOR_VERDICT=$(jq -r '.prior_verdict // ""' "$DELTA_FILE" 2>/dev/null)
					context+="- Mode: DELTA_REVIEW - Focus only on new_commits"$'\n'
					context+="- Prior verdict: $PRIOR_VERDICT"$'\n'
					context+="- Only analyze changes since prior review"$'\n'
				else
					context+="- Mode: FULL_REVIEW - Complete analysis required"$'\n'
				fi
			else
				context+="No delta file found. This is a FULL_REVIEW."$'\n'
			fi
			context+=$'\n'

			context+="## Output Requirement"$'\n\n'
			context+="End your response with the strict footer line (hooks handle signing):"$'\n\n'
			context+='```'$'\n'
			context+='QA_VERDICT:{"verdict":"APPROVED|BLOCKED|NEEDS_INPUT","summary":"...","blockers":[],"questions":[]}'
			context+=$'\n```\n\n'
			context+="Signing is handled automatically by hooks."$'\n\n'
			context+="==="
			;;

		review-lead)
			# Phase 2 aggregator
			if [[ -f "$SHARED_CONTEXT_DOC" ]]; then
				context+=$(cat "$SHARED_CONTEXT_DOC")
				context+=$'\n\n---\n\n'
			fi

			context+="=== QA Review Lead Context (Phase 2) ==="
			context+=$'\n\n'

			# Canonical input
			context+="## Canonical Input (input.json)"
			context+=$'\n\n'
			if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
				context+='```json'$'\n'
				context+=$(cat "$QA_CURRENT_DIR/input.json")
				context+=$'\n```\n\n'
			else
				context+="WARNING: input.json not found"$'\n\n'
			fi

			# Phase 1 outputs
			context+="## Phase 1 Reviewer Outputs"
			context+=$'\n\n'

			local PHASE1_AGENTS=(
				"review-ci-tests-required"
				"review-claims-auditor"
				"review-contracts-boundaries"
				"review-mechanics-content"
				"review-infra-concurrency"
				"review-tests-docs-dry"
			)

			for p1_agent in "${PHASE1_AGENTS[@]}"; do
				context+="### $p1_agent"$'\n\n'
				local OUTPUT_FILE="$QA_OUTPUT_DIR/${p1_agent}.json"
				if [[ -f "$OUTPUT_FILE" ]]; then
					local VERDICT SUMMARY
					VERDICT=$(jq -r '.verdict // "UNKNOWN"' "$OUTPUT_FILE" 2>/dev/null)
					SUMMARY=$(jq -r '.summary // ""' "$OUTPUT_FILE" 2>/dev/null)
					context+="**Verdict:** $VERDICT"$'\n'
					context+="**Summary:** $SUMMARY"$'\n\n'
					context+="<details>"$'\n'
					context+="<summary>Full output (click to expand)</summary>"$'\n\n'
					context+='```json'$'\n'
					context+=$(cat "$OUTPUT_FILE")
					context+=$'\n```\n'
					context+="</details>"$'\n'
				else
					context+="**ERROR:** Output file not found: $OUTPUT_FILE"$'\n'
				fi
				context+=$'\n'
			done

			context+="## Aggregation Logic"$'\n\n'
			context+="Apply conservative aggregation:"$'\n'
			context+="- If ANY verdict == ERROR -> ERROR"$'\n'
			context+="- Else if ANY verdict == BLOCKED -> BLOCKED"$'\n'
			context+="- Else if ANY verdict == NEEDS_INPUT -> NEEDS_INPUT"$'\n'
			context+="- Else continue to final sanity checks"$'\n\n'

			context+="## Output Requirement"$'\n\n'
			context+="End your response with the strict footer line (hooks handle signing):"$'\n\n'
			context+='```'$'\n'
			context+='QA_VERDICT:{"verdict":"APPROVED|BLOCKED|NEEDS_INPUT","summary":"...","blockers":[],"questions":[]}'
			context+=$'\n```\n\n'
			context+="Signing is handled automatically by hooks."$'\n\n'
			context+="==="
			;;

		safe-deployment-gate)
			# Phase 3 deployment gate
			local OVERRIDE_TOKEN_FILE="$QA_CURRENT_DIR/override-token"

			if [[ -f "$OVERRIDE_TOKEN_FILE" ]]; then
				local STORED_HEAD
				STORED_HEAD=$(jq -r '.head // ""' "$OVERRIDE_TOKEN_FILE" 2>/dev/null)

				context+="=== OVERRIDE MODE ACTIVE ==="$'\n\n'
				context+="A verified override token has been provided by the user."$'\n'
				context+="The pre-task hook has verified the token and HEAD binding."$'\n\n'
				context+="Authorized HEAD: $STORED_HEAD"$'\n\n'
				context+="## Your ONLY Action"$'\n\n'
				context+="Run verify-and-push.sh with --override mode:"$'\n\n'
				context+='```bash'$'\n'
				context+='.claude/agents/sub-agent/scripts/verify-and-push.sh --override "$(jq -r .token /tmp/claude/qa/current/override-token)"'
				context+=$'\n```\n\n'
				context+="The script will:"$'\n'
				context+="- Re-verify the token (defense in depth)"$'\n'
				context+="- Verify HEAD matches authorized commit"$'\n'
				context+="- Execute git push"$'\n'
				context+="- Clean up all QA files including the token file"$'\n\n'
				context+="DO NOT run the normal --from-disk mode. Override mode bypasses QA workflow."$'\n\n'
				context+="==="
			else
				context+="=== QA Phase 3: Safe Deployment Gate ==="$'\n\n'
				context+="The pre-task hook has verified review-lead.json signature."$'\n\n'
				context+="## Your ONLY Action"$'\n\n'
				context+="Run verify-and-push.sh with --from-disk mode:"$'\n\n'
				context+='```bash'$'\n'
				context+='.claude/agents/sub-agent/scripts/verify-and-push.sh --from-disk'
				context+=$'\n```\n\n'
				context+="The script will:"$'\n'
				context+="- Read review-lead.json from disk"$'\n'
				context+="- Verify the QA_FINAL_SIGNATORY signature"$'\n'
				context+="- Validate input hash and HEAD commit"$'\n'
				context+="- Execute git push"$'\n'
				context+="- Clean up all QA files on success"$'\n\n'
				context+="==="
			fi
			;;

		*)
			# Unknown agent type, no context to inject
			;;
	esac

	echo "$context"
}
