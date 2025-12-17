#!/bin/bash
# PreToolUse hook for Task - validates subagent INPUT format
# Only validates code-reviewer, test-runner, and pusher subagents

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Only validate specific subagent types
case "$SUBAGENT" in
	code-reviewer|test-runner|pusher)
		;;
	*)
		# Not a tracked subagent, allow silently
		exit 0
		;;
esac

# Check if prompt contains INPUT JSON block
if ! echo "$PROMPT" | grep -q '```json'; then
	cat << 'EOF'
{"decision":"block","reason":"Missing INPUT JSON block. Master-agent MUST provide structured INPUT per agent-intercommunication-protocols.md:\n\n```json\n{ \"branch\": \"...\", ... }\n```\n\nSee .claude/agents/shared/docs/agent-intercommunication-protocols.md for required fields."}
EOF
	exit 0
fi

# Validate INPUT contains required branch field (common to all subagents)
if ! echo "$PROMPT" | grep -q '"branch"'; then
	cat << 'EOF'
{"decision":"block","reason":"INPUT JSON missing required 'branch' field. See agent-intercommunication-protocols.md for the complete INPUT schema."}
EOF
	exit 0
fi

# Subagent-specific validation
case "$SUBAGENT" in
	test-runner)
		if ! echo "$PROMPT" | grep -q '"files_changed"'; then
			cat << 'EOF'
{"decision":"block","reason":"test-runner INPUT missing 'files_changed' field. Required: { branch, commits, files_changed }"}
EOF
			exit 0
		fi
		;;
	code-reviewer)
		if ! echo "$PROMPT" | grep -q '"original_request"'; then
			cat << 'EOF'
{"decision":"block","reason":"code-reviewer INPUT missing 'original_request' field. Required: { branch, commits, original_request, changes_summary, user_approval }"}
EOF
			exit 0
		fi
		;;
	pusher)
		if ! echo "$PROMPT" | grep -q '"payload"\|"override_token"'; then
			cat << 'EOF'
{"decision":"block","reason":"pusher INPUT missing 'payload' or 'override_token' field. Required: { branch, payload, signature } OR { branch, override_token }"}
EOF
			exit 0
		fi
		;;
esac

# All checks passed
exit 0
