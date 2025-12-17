#!/bin/bash
#
# PreToolUse hook — Block raw git push, enforce verify-bulk-and-push.sh
#
# Security model:
#   - ALL agents are blocked from running `git push` directly
#   - Agents MUST use `.claude/agents/sub-agent/scripts/verify-bulk-and-push.sh` which:
#     1. Verifies all 6 QA signatures via crypto-gate verify-bulk
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

# Allow verify-bulk-and-push.sh or verify-and-push.sh (for backwards compat/override)
if [[ "$COMMAND" == *"verify-bulk-and-push"* ]] || [[ "$COMMAND" == *"verify-and-push"* ]]; then
	exit 0
fi

# Allow --dry-run for testing
if [[ "$COMMAND" == *"--dry-run"* ]]; then
	exit 0
fi

# Block all other git push attempts
cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Use verify-bulk-and-push.sh instead                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct git push is not allowed. You must use the verified push workflow.

WORKFLOW:
1. Phase 1: Run 6 reviewers in parallel (review-ci-tests-required + 5 specialists)
2. Phase 2: Run review-lead with 6 signatures → produces final signature
3. Phase 3: Run safe-deployment-gate with review-lead's signature to push

BLOCKED
exit 2
