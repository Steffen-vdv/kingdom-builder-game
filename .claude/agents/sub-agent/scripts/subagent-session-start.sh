#!/bin/bash

# Subagent setup hook for Kingdom Builder
# Registers subagent context and outputs protocol documentation
# Note: crypto-gate binary is downloaded by master-agent at session start
#
# Uses hookSpecificOutput.additionalContext for context injection
# to work around SubagentStart stdout injection bug (same as SessionStart)

# Read stdin FIRST before cd (stdin may not survive cd in some shells)
HOOK_INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

# Extract agent_type and agent_id from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)
AGENT_ID=$(echo "$HOOK_INPUT" | jq -r '.agent_id // empty' 2>/dev/null)

log_session "subagent:$AGENT_TYPE" "SubagentStart"

# =============================================================================
# AGENT TYPE MAPPING FOR SUBAGENT STOP
# =============================================================================
# SDK doesn't pass agent_type to SubagentStop, only to SubagentStart.
# Store the mapping so SubagentStop can look it up by agent_id.

AGENT_MAP_DIR="/tmp/claude/context-manager"
if [[ -n "$AGENT_ID" && -n "$AGENT_TYPE" ]]; then
	mkdir -p "$AGENT_MAP_DIR"
	echo "$AGENT_TYPE" > "$AGENT_MAP_DIR/agent-$AGENT_ID.type"
	log_hook "$AGENT_TYPE" "Stored agent_type mapping for agent_id=$AGENT_ID"
fi

# Register subagent context (only for custom agents)
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-subagent.sh" "$AGENT_TYPE"

log_session "subagent:$AGENT_TYPE" "SubagentStart" "completed"

# =============================================================================
# QA AGENT CONTEXT INJECTION
# =============================================================================
# For QA agents, inject the ACTUAL CONTENTS of canonical input and delta files.
# Agents should NEVER be required to open files manually for critical context.
#
# Uses hookSpecificOutput.additionalContext to bypass stdout injection bug.

QA_CURRENT_DIR="/tmp/claude/qa/current"
QA_OUTPUT_DIR="/tmp/claude/sub-agents/output"
SHARED_CONTEXT_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/sub-agent/docs/shared-context.md"

# Build context string based on agent type
CONTEXT=""

case "$AGENT_TYPE" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry)
		CONTEXT+="=== QA Phase 1 Reviewer Context ===

"
		# Inject shared context for interpreting input.json fields
		if [[ -f "$SHARED_CONTEXT_DOC" ]]; then
			CONTEXT+="$(cat "$SHARED_CONTEXT_DOC")

"
		fi

		# Inject canonical input contents
		CONTEXT+="## Canonical Input (input.json)

"
		if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
			CONTEXT+="\`\`\`json
"
			CONTEXT+="$(cat "$QA_CURRENT_DIR/input.json")
"
			CONTEXT+="\`\`\`
"
		else
			CONTEXT+="WARNING: input.json not found at $QA_CURRENT_DIR/input.json
"
		fi
		CONTEXT+="
"

		# Inject delta file contents
		DELTA_FILE="$QA_CURRENT_DIR/delta/${AGENT_TYPE}.json"
		CONTEXT+="## Delta Review Info (delta/${AGENT_TYPE}.json)

"
		if [[ -f "$DELTA_FILE" ]]; then
			CONTEXT+="\`\`\`json
"
			CONTEXT+="$(cat "$DELTA_FILE")
"
			CONTEXT+="\`\`\`

"
			CONTEXT+="**Interpretation:**
"
			MODE=$(jq -r '.mode // ""' "$DELTA_FILE" 2>/dev/null || echo "")
			if [[ "$MODE" == "DELTA_REVIEW" ]]; then
				PRIOR_VERDICT=$(jq -r '.prior_verdict // ""' "$DELTA_FILE" 2>/dev/null || echo "")
				PRIOR_BLOCKERS=$(jq -r '.prior_blockers // []' "$DELTA_FILE" 2>/dev/null || echo "[]")
				PRIOR_QUESTIONS=$(jq -r '.prior_questions // []' "$DELTA_FILE" 2>/dev/null || echo "[]")
				CONTEXT+="- Mode: DELTA_REVIEW - Focus only on new_commits
"
				CONTEXT+="- Prior verdict: $PRIOR_VERDICT
"
				CONTEXT+="- Only analyze changes since prior review
"
				# Show prior blockers if any existed
				if [[ "$PRIOR_BLOCKERS" != "[]" && "$PRIOR_BLOCKERS" != "null" ]]; then
					CONTEXT+="
**Prior Blockers (verify these are resolved by new commits):**
"
					# Format blockers as a bulleted list using jq
					CONTEXT+="$(echo "$PRIOR_BLOCKERS" | jq -r '.[] | "- " + .' 2>/dev/null)
"
				fi
				# Show prior questions if any existed
				if [[ "$PRIOR_QUESTIONS" != "[]" && "$PRIOR_QUESTIONS" != "null" ]]; then
					CONTEXT+="
**Prior Questions (check if answered by new commits/prompts):**
"
					# Format questions as a bulleted list using jq
					CONTEXT+="$(echo "$PRIOR_QUESTIONS" | jq -r '.[] | "- " + .' 2>/dev/null)
"
				fi
			else
				CONTEXT+="- Mode: FULL_REVIEW - Complete analysis required
"
			fi
		else
			CONTEXT+="No delta file found. This is a FULL_REVIEW.
"
		fi
		CONTEXT+="
"

		CONTEXT+="## Output Requirement

End your response with the strict footer line (hooks handle signing):

\`\`\`
QA_VERDICT:{\"verdict\":\"APPROVED|BLOCKED|NEEDS_INPUT\",\"summary\":\"...\",\"blockers\":[],\"questions\":[]}
\`\`\`

DO NOT call sign.sh or write-output.sh - the post-task hook handles signing.

===
"
		;;

	review-lead)
		CONTEXT+="=== QA Review Lead Context (Phase 2) ===

"
		# Inject shared context for interpreting input.json fields
		if [[ -f "$SHARED_CONTEXT_DOC" ]]; then
			CONTEXT+="$(cat "$SHARED_CONTEXT_DOC")

"
		fi

		# Inject canonical input contents
		CONTEXT+="## Canonical Input (input.json)

"
		if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
			CONTEXT+="\`\`\`json
"
			CONTEXT+="$(cat "$QA_CURRENT_DIR/input.json")
"
			CONTEXT+="\`\`\`
"
		else
			CONTEXT+="WARNING: input.json not found
"
		fi
		CONTEXT+="
"

		# Inject all 6 Phase 1 output files
		CONTEXT+="## Phase 1 Reviewer Outputs

"
		PHASE1_AGENTS=(
			"review-ci-tests-required"
			"review-claims-auditor"
			"review-contracts-boundaries"
			"review-mechanics-content"
			"review-infra-concurrency"
			"review-tests-docs-dry"
		)

		for agent in "${PHASE1_AGENTS[@]}"; do
			CONTEXT+="### $agent

"
			OUTPUT_FILE="$QA_OUTPUT_DIR/${agent}.json"
			if [[ -f "$OUTPUT_FILE" ]]; then
				# Extract key fields for quick summary
				VERDICT=$(jq -r '.verdict // "UNKNOWN"' "$OUTPUT_FILE" 2>/dev/null || echo "ERROR")
				SUMMARY=$(jq -r '.summary // ""' "$OUTPUT_FILE" 2>/dev/null || echo "")
				CONTEXT+="**Verdict:** $VERDICT
"
				CONTEXT+="**Summary:** $SUMMARY

"
				CONTEXT+="<details>
<summary>Full output (click to expand)</summary>

\`\`\`json
"
				CONTEXT+="$(cat "$OUTPUT_FILE")
"
				CONTEXT+="\`\`\`
</details>
"
			else
				CONTEXT+="**ERROR:** Output file not found: $OUTPUT_FILE
"
			fi
			CONTEXT+="
"
		done

		CONTEXT+="## Aggregation Logic

Apply conservative aggregation:
- If ANY verdict == ERROR → ERROR
- Else if ANY verdict == BLOCKED → BLOCKED
- Else if ANY verdict == NEEDS_INPUT → NEEDS_INPUT
- Else continue to final sanity checks

## Output Requirement

End your response with the strict footer line (hooks handle signing):

\`\`\`
QA_VERDICT:{\"verdict\":\"APPROVED|BLOCKED|NEEDS_INPUT\",\"summary\":\"...\",\"blockers\":[],\"questions\":[]}
\`\`\`

DO NOT call sign.sh or write-output.sh - the post-task hook handles signing.

===
"
		;;

	safe-deployment-gate)
		# Check if override token file exists
		# File format: {"head":"<sha>","branch":"<branch>","token":"<token>"}
		OVERRIDE_TOKEN_FILE="$QA_CURRENT_DIR/override-token"

		if [[ -f "$OVERRIDE_TOKEN_FILE" ]]; then
			# Extract token from JSON file
			STORED_HEAD=$(jq -r '.head // ""' "$OVERRIDE_TOKEN_FILE" 2>/dev/null || echo "")

			# OVERRIDE MODE: Inject token and skip normal QA context
			CONTEXT+="=== OVERRIDE MODE ACTIVE ===

A verified override token has been provided by the user.
The pre-task hook has verified the token and HEAD binding.

Authorized HEAD: $STORED_HEAD

## Your ONLY Action

Run verify-and-push.sh with --override mode:

\`\`\`bash
.claude/agents/sub-agent/scripts/verify-and-push.sh --override \"\$(jq -r .token /tmp/claude/qa/current/override-token)\"
\`\`\`

The script will:
- Re-verify the token (defense in depth)
- Verify HEAD matches authorized commit
- Execute git push
- Clean up all QA files including the token file

DO NOT run the normal --from-disk mode. Override mode bypasses QA workflow.

===
"
		else
			# NORMAL QA MODE: Inject review-lead.json context
			CONTEXT+="=== QA Phase 3: Safe Deployment Gate ===

The pre-task hook has verified review-lead.json signature.

## Your ONLY Action

Run verify-and-push.sh with --from-disk mode:

\`\`\`bash
.claude/agents/sub-agent/scripts/verify-and-push.sh --from-disk
\`\`\`

The script will:
- Read review-lead.json from disk
- Verify the QA_FINAL_SIGNATORY signature
- Validate input hash and HEAD commit
- Execute git push
- Clean up all QA files on success

===
"
		fi
		;;
esac

# Append protocol spec
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

CONTEXT+="
=== Subagent Communication Protocol ===
Your chat output can be free-form narrative. For QA agents, the post-task hook
parses your QA_VERDICT footer line to create the signed output file.

"

if [[ -f "$PROTOCOL_DOC" ]]; then
	CONTEXT+="$(cat "$PROTOCOL_DOC")"
fi

# Output structured JSON with hookSpecificOutput.additionalContext
# Using jq to properly escape the content for JSON
# IMPORTANT: hookEventName is required by the schema
jq -n --arg context "$CONTEXT" '{
  "hookSpecificOutput": {
    "hookEventName": "SubagentStart",
    "additionalContext": $context
  }
}'

exit 0
