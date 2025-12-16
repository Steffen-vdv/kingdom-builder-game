#!/bin/bash
#
# PreToolUse hook — Block raw git push, enforce verified-push.sh
#
# Security model:
#   - ALL agents are blocked from running `git push` directly
#   - Agents MUST use `.claude/agents/sub-agent/scripts/verify-and-push.sh` which:
#     1. Verifies signature via crypto-gate binary
#     2. Validates HEAD is in approved commits
#     3. Then executes git push
#
# This eliminates the need for marker files or environment guards.
# Security comes from cryptography: only agents with crypto-gate access
# can produce valid signatures.
#

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse command from tool input JSON
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only intercept raw git push commands
if [[ ! "$COMMAND" == *"git push"* ]]; then
	exit 0
fi

# Allow verify-and-push.sh (it will call git push internally after verification)
if [[ "$COMMAND" == *"verify-and-push"* ]]; then
	exit 0
fi

# Allow --dry-run for testing
if [[ "$COMMAND" == *"--dry-run"* ]]; then
	exit 0
fi

# Block all other git push attempts
cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Use verify-and-push.sh instead                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct git push is not allowed. You must use the verified push workflow.

WORKFLOW:
1. Run test-runner to verify tests pass
2. Run code-reviewer to get QA approval (returns payload + signature)
3. Run pusher with payload + signature to push

BLOCKED
exit 2
