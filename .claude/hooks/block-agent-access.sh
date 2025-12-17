#!/bin/bash

# Restrict EXECUTION based on agent context:
# - bin/                         → subagent only (crypto tools)
# - sub-agent/scripts/           → subagent only (sign.sh, verify scripts)
# - master-agent/scripts/        → master-agent only (session hooks)
# - .claude/hooks/               → NOBODY (system-invoked only)
#
# NOTE: Read/Write/Edit/Glob/Grep are ALLOWED for all directories.
# Only EXECUTION (Bash) is restricted for security purposes.

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse the tool input
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Only restrict Bash execution - allow all file operations (Read/Write/Edit/Glob/Grep)
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
	exit 0
fi

# For Bash commands, extract executable paths (starting with ./ or / or bare path)
# This avoids false positives from text in arguments like commit messages
EXEC_PATH=""
if [[ -n "$COMMAND" ]]; then
	# Extract first word that looks like an executable path
	EXEC_PATH=$(echo "$COMMAND" | grep -oE '(^|[[:space:]])(\.?/[^[:space:]]+)' | head -1 | xargs)
fi

# Check what's being executed
EXECUTES_BIN=false
EXECUTES_SUBAGENT_SCRIPTS=false
EXECUTES_MASTER_SCRIPTS=false
EXECUTES_HOOKS=false

# Check bin/ execution
if [[ "$EXEC_PATH" == *"/bin/"* ]] || [[ "$COMMAND" == bin/* ]]; then
	EXECUTES_BIN=true
fi

# Check sub-agent/scripts/ execution
if [[ "$EXEC_PATH" == *"/sub-agent/scripts/"* ]] || \
   [[ "$COMMAND" == *".claude/"*"sub-agent/scripts/"* ]]; then
	EXECUTES_SUBAGENT_SCRIPTS=true
fi

# Check master-agent/scripts/ execution
if [[ "$EXEC_PATH" == *"/master-agent/scripts/"* ]] || \
   [[ "$COMMAND" == *".claude/"*"master-agent/scripts/"* ]]; then
	EXECUTES_MASTER_SCRIPTS=true
fi

# Check .claude/hooks/ EXECUTION - hooks are system-invoked, never agent-invoked
if [[ "$EXEC_PATH" == *"/.claude/hooks/"* ]] || \
   [[ "$EXEC_PATH" == *".claude/hooks/"* ]] || \
   [[ "$COMMAND" == .claude/hooks/* ]] || \
   [[ "$COMMAND" == bash\ *".claude/hooks/"* ]] || \
   [[ "$COMMAND" == sh\ *".claude/hooks/"* ]]; then
	EXECUTES_HOOKS=true
fi

# If not executing any restricted path, allow
if [[ "$EXECUTES_BIN" != "true" ]] && \
   [[ "$EXECUTES_SUBAGENT_SCRIPTS" != "true" ]] && \
   [[ "$EXECUTES_MASTER_SCRIPTS" != "true" ]] && \
   [[ "$EXECUTES_HOOKS" != "true" ]]; then
	exit 0
fi

# Get current context
CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
CONTEXT=$("$CTX_MGR/get-context.sh" 2>/dev/null)

# Default to master-agent if context manager not available (safe default)
if [[ -z "$CONTEXT" ]]; then
	CONTEXT="master-agent"
fi

# Enforce execution rules
BLOCKED_REASON=""

# bin/ execution → subagent only
if [[ "$EXECUTES_BIN" == "true" ]] && [[ "$CONTEXT" != "subagent" ]]; then
	BLOCKED_REASON="Executing bin/ scripts is restricted to subagents (crypto tools)"
fi

# sub-agent/scripts/ execution → subagent only
if [[ "$EXECUTES_SUBAGENT_SCRIPTS" == "true" ]] && [[ "$CONTEXT" != "subagent" ]]; then
	BLOCKED_REASON="Executing sub-agent/scripts/ is restricted to subagents"
fi

# master-agent/scripts/ execution → master-agent only
if [[ "$EXECUTES_MASTER_SCRIPTS" == "true" ]] && [[ "$CONTEXT" != "master-agent" ]]; then
	BLOCKED_REASON="Executing master-agent/scripts/ is restricted to master-agent"
fi

# .claude/hooks/ execution → NOBODY (system-invoked only, never agent-invoked)
if [[ "$EXECUTES_HOOKS" == "true" ]]; then
	BLOCKED_REASON="Executing .claude/hooks/ scripts is forbidden (system-invoked only)"
fi

# Block if violation detected
if [[ -n "$BLOCKED_REASON" ]]; then
	cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Execution denied                                                ║
║  Context: $CONTEXT
║  Reason: $BLOCKED_REASON
╚═══════════════════════════════════════════════════════════════════════════════╝
BLOCKED
	exit 2
fi

exit 0
