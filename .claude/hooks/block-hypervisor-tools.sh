#!/bin/bash

# Block hypervisor from using unauthorized tools
# Allowed tools: Task, Read, Glob, Grep
# For Task tool: block deprecated subagent_types (Explore, Plan)
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
ALLOWED_TOOLS=("Task" "Read" "Glob" "Grep")

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

As hypervisor, you may only use: Task, Read, Glob, Grep

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

# For Task tool, check for deprecated subagent_types
if [[ "$TOOL_NAME" == "Task" ]]; then
  SUBAGENT_TYPE=$(echo "$JSON_INPUT" | jq -r '.tool_input.subagent_type // empty' 2>/dev/null)

  if [[ "$SUBAGENT_TYPE" == "Explore" || "$SUBAGENT_TYPE" == "Plan" ]]; then
    cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Deprecated subagent_type: $SUBAGENT_TYPE
╚═══════════════════════════════════════════════════════════════════════════════╝

The built-in Explore and Plan agents are DEPRECATED for this project.
Use our custom agents instead:

  - Explore → use minimind (subagent_type="minimind")
  - Plan → use mastermind (subagent_type="mastermind")

Re-read: .claude/agents/hypervisor/docs/hypervisor.md (Section 4)
BLOCKED
    exit 2
  fi
fi

# Tool allowed
exit 0
