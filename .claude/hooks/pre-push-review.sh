#!/bin/bash
#
# PreToolUse hook — Block raw git push, enforce verified-push.sh
#
# Security model:
#   - ALL agents are blocked from running `git push` directly
#   - Agents MUST use `scripts/pusher-agent/verified-push.sh` which:
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

# Allow verified-push.sh (it will call git push internally after verification)
if [[ "$COMMAND" == *"verified-push"* ]]; then
	exit 0
fi

# Allow --dry-run for testing
if [[ "$COMMAND" == *"--dry-run"* ]]; then
	exit 0
fi

# Block all other git push attempts
cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Use verified-push.sh instead                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct git push is not allowed. You must use the verified push workflow.

CHECKLIST (verify before proceeding):
  □ Changes committed
  □ Tests passing
  □ Claims prepared (original request, solution, layer, tests, user approval)
  □ Subagent I/O displayed verbatim (see docs/agent-task-workflow.md)
  □ QA review completed with APPROVED verdict
  □ Payload and signature received from QA

WORKFLOW:
1. QA subagent reviews code and signs approval
2. QA returns {payload, signature} to main agent (or BLOCKED/NEEDS_INPUT verdict on failure)
3. Main agent passes {payload, signature} to Pusher subagent
4. Pusher verifies approval signature and executes git push
5. Pusher returns SUCCESS/FAILED/ERROR response to main agent (see docs/agent-task-workflow.md)

FAILURE RESPONSES:
  - QA may return BLOCKED (violation found) or NEEDS_INPUT (clarification needed)
  - Pusher may return FAILED (invalid signature, HEAD mismatch) or ERROR (script/system failure)

REFERENCE: See docs/agent-task-workflow.md for complete workflow details.
BLOCKED
exit 2
