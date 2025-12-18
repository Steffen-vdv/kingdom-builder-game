#!/bin/bash
# PreToolUse hook for Task - validates subagent INPUT format
# Only validates QA reviewers and safe-deployment-gate subagents
#
# Phase 1 reviewers: review-ci-tests-required + 5 specialist reviewers
# Phase 2 reviewer: review-lead (aggregates Phase 1)
# Phase 3: safe-deployment-gate (pushes with review-lead's signature)

source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')
MODEL_OVERRIDE=$(echo "$INPUT" | jq -r '.tool_input.model // ""')

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

# Only validate specific subagent types
case "$SUBAGENT" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry|review-lead|safe-deployment-gate)
		log_hook "$SUBAGENT" "Starting"
		;;
	*)
		# Not a tracked subagent, allow silently
		exit 0
		;;
esac

# Validate prompt is valid JSON (per protocol: pure JSON, no markdown)
if ! echo "$PROMPT" | jq '.' >/dev/null 2>&1; then
	cat << 'EOF'
{"decision":"block","reason":"INPUT is not valid JSON. Prompt must be a pure JSON object.\n\nExample: {\"branch\": \"...\", \"commits\": [...]}"}
EOF
	exit 1
fi

# Parse the JSON for field validation
PARSED=$(echo "$PROMPT" | jq '.')

# Validate INPUT contains required branch field (common to all subagents)
if ! echo "$PARSED" | jq -e '.branch' >/dev/null 2>&1; then
	cat << 'EOF'
{"decision":"block","reason":"INPUT JSON missing required 'branch' field."}
EOF
	exit 1
fi

# Validate commits field for agents that require it (all except safe-deployment-gate)
# safe-deployment-gate uses approval.payload which contains commits internally
if [[ "$SUBAGENT" != "safe-deployment-gate" ]]; then
	if ! echo "$PARSED" | jq -e '.commits | type == "array"' >/dev/null 2>&1; then
		cat << EOF
{"decision":"block","reason":"INPUT JSON missing or invalid 'commits' field. Must be a JSON array of commit SHAs.\n\nExample: {\"branch\": \"...\", \"commits\": [\"abc123\", \"def456\"], ...}"}
EOF
		exit 0
	fi

	# Validate commits array is non-empty
	COMMITS_COUNT=$(echo "$PARSED" | jq '.commits | length' 2>/dev/null)
	if [[ "$COMMITS_COUNT" == "0" ]]; then
		cat << 'EOF'
{"decision":"block","reason":"INPUT JSON 'commits' array is empty. At least one commit SHA is required."}
EOF
		exit 0
	fi
fi

# Subagent-specific validation
case "$SUBAGENT" in
	review-ci-tests-required)
		if ! echo "$PARSED" | jq -e '.files_changed' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"review-ci-tests-required INPUT missing 'files_changed' field. Required: { branch, commits, files_changed }"}
EOF
			exit 1
		fi
		;;
	review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry)
		if ! echo "$PARSED" | jq -e '.original_request' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"QA reviewer INPUT missing 'original_request' field. Required: { branch, commits, original_request, changes_summary, user_approval, files_changed }"}
EOF
			exit 1
		fi
		;;
	review-lead)
		# Phase 2: review-lead needs approvals_json from Phase 1 reviewers
		if ! echo "$PARSED" | jq -e '.approvals_json' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"review-lead INPUT missing 'approvals_json' field. Required: { branch, commits, approvals_json, original_request, changes_summary }"}
EOF
			exit 1
		fi
		;;
	safe-deployment-gate)
		# Phase 3: safe-deployment-gate needs single approval or override token
		if ! echo "$PARSED" | jq -e '.approval // .override_token' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"safe-deployment-gate INPUT missing 'approval' or 'override_token' field. Required: { branch, approval } OR { branch, override_token }"}
EOF
			exit 1
		fi
		;;
esac

# All checks passed
exit 0
