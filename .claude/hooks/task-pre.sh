#!/bin/bash
# PreToolUse hook for Task - validates subagent INPUT format
# Only validates QA reviewers, test-runner, and pusher subagents

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Only validate specific subagent types
case "$SUBAGENT" in
	review-lead|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry|test-runner|pusher)
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
	exit 0
fi

# Parse the JSON for field validation
PARSED=$(echo "$PROMPT" | jq '.')

# Validate INPUT contains required branch field (common to all subagents)
if ! echo "$PARSED" | jq -e '.branch' >/dev/null 2>&1; then
	cat << 'EOF'
{"decision":"block","reason":"INPUT JSON missing required 'branch' field."}
EOF
	exit 0
fi

# Subagent-specific validation
case "$SUBAGENT" in
	test-runner)
		if ! echo "$PARSED" | jq -e '.files_changed' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"test-runner INPUT missing 'files_changed' field. Required: { branch, commits, files_changed }"}
EOF
			exit 0
		fi
		;;
	review-lead|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry)
		if ! echo "$PARSED" | jq -e '.original_request' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"QA reviewer INPUT missing 'original_request' field. Required: { branch, commits, original_request, changes_summary, user_approval, files_changed }"}
EOF
			exit 0
		fi
		;;
	pusher)
		if ! echo "$PARSED" | jq -e '.approvals // .override_token' >/dev/null 2>&1; then
			cat << 'EOF'
{"decision":"block","reason":"pusher INPUT missing 'approvals' or 'override_token' field. Required: { branch, approvals } OR { branch, override_token }"}
EOF
			exit 0
		fi
		;;
esac

# All checks passed
exit 0
