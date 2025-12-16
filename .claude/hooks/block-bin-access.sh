#!/bin/bash

# Restrict bin/ directory access based on agent context

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse the tool input - check command for Bash, file_path for Read/Write/Edit,
# path/pattern for Glob/Grep
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
PATH_ARG=$(echo "$JSON_INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null)
PATTERN=$(echo "$JSON_INPUT" | jq -r '.tool_input.pattern // empty' 2>/dev/null)

# Check if any of these reference bin/
ACCESSES_BIN=false

if [[ "$COMMAND" == *"/bin/"* ]] || [[ "$COMMAND" == *" bin/"* ]] || [[ "$COMMAND" =~ ^bin/ ]]; then
	ACCESSES_BIN=true
fi

if [[ "$FILE_PATH" == *"/bin/"* ]] || [[ "$FILE_PATH" =~ ^bin/ ]]; then
	ACCESSES_BIN=true
fi

if [[ "$PATH_ARG" == *"/bin/"* ]] || [[ "$PATH_ARG" =~ ^bin/ ]]; then
	ACCESSES_BIN=true
fi

# If not accessing bin/, allow
if [[ "$ACCESSES_BIN" != "true" ]]; then
	exit 0
fi

# Accessing bin/ - check if master-agent context
CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
CONTEXT=$("$CTX_MGR/get-context.sh" 2>/dev/null)

# Default to master-agent if context manager not available (safe default)
if [[ -z "$CONTEXT" ]]; then
	CONTEXT="master-agent"
fi

# Only subagents can access bin/
if [[ "$CONTEXT" != "subagent" ]]; then
	cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Access denied                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝
BLOCKED
	exit 2
fi

exit 0
