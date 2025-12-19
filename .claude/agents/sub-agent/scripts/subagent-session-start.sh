#!/bin/bash

# Subagent setup hook for Kingdom Builder
# Registers subagent context and outputs protocol documentation
# Note: crypto-gate binary is downloaded by master-agent at session start

# Read stdin FIRST before cd (stdin may not survive cd in some shells)
HOOK_INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

# Extract agent_type from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

log_session "subagent:$AGENT_TYPE" "SubagentStart"

# Register subagent context (only for custom agents)
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-subagent.sh" "$AGENT_TYPE"

log_session "subagent:$AGENT_TYPE" "SubagentStart" "completed"

# =============================================================================
# QA AGENT CONTEXT INJECTION
# =============================================================================
# For QA agents, inject the ACTUAL CONTENTS of canonical input and delta files.
# Agents should NEVER be required to open files manually for critical context.

QA_CURRENT_DIR="/tmp/claude/qa/current"
QA_OUTPUT_DIR="/tmp/claude/sub-agents/output"

case "$AGENT_TYPE" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry)
		echo "=== QA Phase 1 Reviewer Context ==="
		echo ""

		# Inject canonical input contents
		echo "## Canonical Input (input.json)"
		echo ""
		if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
			echo '```json'
			cat "$QA_CURRENT_DIR/input.json"
			echo ""
			echo '```'
		else
			echo "WARNING: input.json not found at $QA_CURRENT_DIR/input.json"
		fi
		echo ""

		# Inject delta file contents
		DELTA_FILE="$QA_CURRENT_DIR/delta/${AGENT_TYPE}.json"
		echo "## Delta Review Info (delta/${AGENT_TYPE}.json)"
		echo ""
		if [[ -f "$DELTA_FILE" ]]; then
			echo '```json'
			cat "$DELTA_FILE"
			echo ""
			echo '```'
			echo ""
			echo "**Interpretation:**"
			MODE=$(jq -r '.mode // ""' "$DELTA_FILE" 2>/dev/null || echo "")
			if [[ "$MODE" == "DELTA_REVIEW" ]]; then
				PRIOR_VERDICT=$(jq -r '.prior_verdict // ""' "$DELTA_FILE" 2>/dev/null || echo "")
				echo "- Mode: DELTA_REVIEW - Focus only on new_commits"
				echo "- Prior verdict: $PRIOR_VERDICT"
				echo "- Only analyze changes since prior review"
			else
				echo "- Mode: FULL_REVIEW - Complete analysis required"
			fi
		else
			echo "No delta file found. This is a FULL_REVIEW."
		fi
		echo ""

		cat << 'QA_PHASE1_FOOTER'
## Output Requirement

End your response with the strict footer line (hooks handle signing):

```
QA_VERDICT:{"verdict":"APPROVED|BLOCKED|NEEDS_INPUT","summary":"...","blockers":[],"questions":[]}
```

Signing is handled automatically by hooks.

===
QA_PHASE1_FOOTER
		;;

	review-lead)
		echo "=== QA Review Lead Context (Phase 2) ==="
		echo ""

		# Inject canonical input contents
		echo "## Canonical Input (input.json)"
		echo ""
		if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
			echo '```json'
			cat "$QA_CURRENT_DIR/input.json"
			echo ""
			echo '```'
		else
			echo "WARNING: input.json not found"
		fi
		echo ""

		# Inject all 6 Phase 1 output files
		echo "## Phase 1 Reviewer Outputs"
		echo ""

		PHASE1_AGENTS=(
			"review-ci-tests-required"
			"review-claims-auditor"
			"review-contracts-boundaries"
			"review-mechanics-content"
			"review-infra-concurrency"
			"review-tests-docs-dry"
		)

		for agent in "${PHASE1_AGENTS[@]}"; do
			echo "### $agent"
			echo ""
			OUTPUT_FILE="$QA_OUTPUT_DIR/${agent}.json"
			if [[ -f "$OUTPUT_FILE" ]]; then
				# Extract key fields for quick summary
				VERDICT=$(jq -r '.verdict // "UNKNOWN"' "$OUTPUT_FILE" 2>/dev/null || echo "ERROR")
				SUMMARY=$(jq -r '.summary // ""' "$OUTPUT_FILE" 2>/dev/null || echo "")
				echo "**Verdict:** $VERDICT"
				echo "**Summary:** $SUMMARY"
				echo ""
				echo "<details>"
				echo "<summary>Full output (click to expand)</summary>"
				echo ""
				echo '```json'
				cat "$OUTPUT_FILE"
				echo ""
				echo '```'
				echo "</details>"
			else
				echo "**ERROR:** Output file not found: $OUTPUT_FILE"
			fi
			echo ""
		done

		cat << 'QA_REVIEW_LEAD_FOOTER'
## Aggregation Logic

Apply conservative aggregation:
- If ANY verdict == ERROR → ERROR
- Else if ANY verdict == BLOCKED → BLOCKED
- Else if ANY verdict == NEEDS_INPUT → NEEDS_INPUT
- Else continue to final sanity checks

## Output Requirement

End your response with the strict footer line (hooks handle signing):

```
QA_VERDICT:{"verdict":"APPROVED|BLOCKED|NEEDS_INPUT","summary":"...","blockers":[],"questions":[]}
```

Signing is handled automatically by hooks.

===
QA_REVIEW_LEAD_FOOTER
		;;

	safe-deployment-gate)
		# Check if override token file exists
		# File format: {"head":"<sha>","branch":"<branch>","token":"<token>"}
		OVERRIDE_TOKEN_FILE="$QA_CURRENT_DIR/override-token"

		if [[ -f "$OVERRIDE_TOKEN_FILE" ]]; then
			# Extract token from JSON file
			OVERRIDE_TOKEN=$(jq -r '.token // ""' "$OVERRIDE_TOKEN_FILE" 2>/dev/null || echo "")
			STORED_HEAD=$(jq -r '.head // ""' "$OVERRIDE_TOKEN_FILE" 2>/dev/null || echo "")

			# OVERRIDE MODE: Inject token and skip normal QA context
			echo "=== OVERRIDE MODE ACTIVE ==="
			echo ""
			echo "A verified override token has been provided by the user."
			echo "The pre-task hook has verified the token and HEAD binding."
			echo ""
			echo "Authorized HEAD: $STORED_HEAD"
			echo ""
			echo "## Your ONLY Action"
			echo ""
			echo "Run verify-and-push.sh with --override mode:"
			echo ""
			echo '```bash'
			echo ".claude/agents/sub-agent/scripts/verify-and-push.sh --override '\$(jq -r .token /tmp/claude/qa/current/override-token)'"
			echo '```'
			echo ""
			echo "The script will:"
			echo "- Re-verify the token (defense in depth)"
			echo "- Verify HEAD matches authorized commit"
			echo "- Execute git push"
			echo "- Clean up all QA files including the token file"
			echo ""
			echo "DO NOT run the normal --from-disk mode. Override mode bypasses QA workflow."
			echo ""
			echo "==="
		else
			# NORMAL QA MODE: Inject review-lead.json context
			echo "=== QA Phase 3: Safe Deployment Gate ==="
			echo ""
			echo "The pre-task hook has verified review-lead.json signature."
			echo ""
			echo "## Your ONLY Action"
			echo ""
			echo "Run verify-and-push.sh with --from-disk mode:"
			echo ""
			echo '```bash'
			echo '.claude/agents/sub-agent/scripts/verify-and-push.sh --from-disk'
			echo '```'
			echo ""
			echo "The script will:"
			echo "- Read review-lead.json from disk"
			echo "- Verify the QA_FINAL_SIGNATORY signature"
			echo "- Validate input hash and HEAD commit"
			echo "- Execute git push"
			echo "- Clean up all QA files on success"
			echo ""
			echo "==="
		fi
		;;
esac

exit 0
