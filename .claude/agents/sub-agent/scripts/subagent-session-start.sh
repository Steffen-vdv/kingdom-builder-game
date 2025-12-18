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
# For QA agents, inject the canonical input file paths and instructions

case "$AGENT_TYPE" in
	review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry)
		cat << 'QA_PHASE1_CONTEXT'
=== QA Phase 1 Reviewer Context ===

CANONICAL INPUT (read these files FIRST):
- /tmp/claude/qa/current/input.json      <- WHAT you're reviewing (branch, commits, files_changed, intent)
- /tmp/claude/qa/current/delta/<agent>.json  <- Your delta review mode

DELTA FILE CONTENTS:
- If mode == "DELTA_REVIEW": focus only on new_commits; prior_verdict tells you what was decided before
- If mode == "FULL_REVIEW": do complete analysis

OUTPUT REQUIREMENT:
End your response with the strict footer line (hooks handle signing):
QA_VERDICT:{"verdict":"APPROVED|BLOCKED|NEEDS_INPUT","summary":"...","blockers":[],"questions":[]}

DO NOT call sign.sh or write-output.sh - the post-task hook handles signing.
===
QA_PHASE1_CONTEXT
		;;

	review-lead)
		cat << 'QA_REVIEW_LEAD_CONTEXT'
=== QA Review Lead Context (Phase 2) ===

CANONICAL INPUT:
- /tmp/claude/qa/current/input.json      <- Review context

PHASE 1 OUTPUT FILES (read ALL 6):
- /tmp/claude/sub-agents/output/review-ci-tests-required.json
- /tmp/claude/sub-agents/output/review-claims-auditor.json
- /tmp/claude/sub-agents/output/review-contracts-boundaries.json
- /tmp/claude/sub-agents/output/review-mechanics-content.json
- /tmp/claude/sub-agents/output/review-infra-concurrency.json
- /tmp/claude/sub-agents/output/review-tests-docs-dry.json

AGGREGATION LOGIC:
- If ANY verdict == ERROR → ERROR
- Else if ANY verdict == BLOCKED → BLOCKED
- Else if ANY verdict == NEEDS_INPUT → NEEDS_INPUT
- Else continue to final sanity checks

OUTPUT REQUIREMENT:
End your response with the strict footer line (hooks handle signing):
QA_VERDICT:{"verdict":"APPROVED|BLOCKED|NEEDS_INPUT","summary":"...","blockers":[],"questions":[]}

DO NOT call sign.sh or write-output.sh - the post-task hook handles signing.
===
QA_REVIEW_LEAD_CONTEXT
		;;
esac

# Output protocol spec (injected into subagent context)
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

cat << 'PROTOCOL_HEADER'
=== Subagent Communication Protocol ===
Your chat output can be free-form narrative. For QA agents, the post-task hook
parses your QA_VERDICT footer line to create the signed output file.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
