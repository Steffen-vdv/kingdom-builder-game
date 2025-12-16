#!/bin/bash

# Block hypervisor from using unauthorized tools
# Allowed tools: Task
# For Task tool: enforce allowlist of valid subagent_types
# Subagents are not restricted by this hook

MARKER_FILE="$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"
AGENT_TYPE=$(cat "$MARKER_FILE" 2>/dev/null)

# Only restrict hypervisor (m_7x9), not subagents
if [[ "$AGENT_TYPE" != "m_7x9" ]]; then
  exit 0
fi

# Parse tool info from input
JSON_INPUT=$(cat)
TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Whitelist of allowed tools for hypervisor
ALLOWED_TOOLS=("Task","Read")

# Check if tool is allowed
TOOL_ALLOWED=false
for allowed in "${ALLOWED_TOOLS[@]}"; do
  if [[ "$TOOL_NAME" == "$allowed" ]]; then
    TOOL_ALLOWED=true
    break
  fi
done

if [[ "$TOOL_ALLOWED" == "false" ]]; then
  cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Hypervisor cannot use tool: $TOOL_NAME
╚═══════════════════════════════════════════════════════════════════════════════╝

As hypervisor, you may only use: Task

Delegate implementation work to appropriate subagent:
  - Code changes → coder
  - Running tests → test-runner
  - Pushing → pusher
  - Deep analysis → mastermind
  - Quick lookups → minimind

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
  exit 2
fi

# For Task tool, enforce allowlist of valid subagent_types
if [[ "$TOOL_NAME" == "Task" ]]; then
  SUBAGENT_TYPE=$(echo "$JSON_INPUT" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)

  # Allowlist of valid subagent_types
  ALLOWED_SUBAGENTS=("mastermind" "minimind" "coder" "test-runner" "code-reviewer" "pusher")

  SUBAGENT_ALLOWED=false
  for allowed in "${ALLOWED_SUBAGENTS[@]}"; do
    if [[ "$SUBAGENT_TYPE" == "$allowed" ]]; then
      SUBAGENT_ALLOWED=true
      break
    fi
  done

  if [[ "$SUBAGENT_ALLOWED" == "false" ]]; then
    cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Invalid subagent_type: $SUBAGENT_TYPE
╚═══════════════════════════════════════════════════════════════════════════════╝

Valid subagent_types are:
  - mastermind    (deep analysis, planning)
  - minimind      (quick lookups, exploration)
  - coder         (code implementation)
  - test-runner   (running and analyzing tests)
  - code-reviewer (QA review)
  - pusher        (push verification)

Re-read: .claude/agents/hypervisor/docs/hypervisor.md (Section 4)
BLOCKED
    exit 2
  fi
fi

# Tool allowed
exit 0
