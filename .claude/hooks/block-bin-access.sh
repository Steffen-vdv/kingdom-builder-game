#!/bin/bash

# Restrict directory access based on agent context:
# - bin/                         → subagent only (crypto tools)
# - sub-agent/scripts/           → subagent only (pusher, verify scripts)
# - master-agent/scripts/        → master-agent only (session hooks)

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse the tool input - check command for Bash, file_path for Read/Write/Edit,
# path/pattern for Glob/Grep
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
PATH_ARG=$(echo "$JSON_INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null)
PATTERN=$(echo "$JSON_INPUT" | jq -r '.tool_input.pattern // empty' 2>/dev/null)

# Check access patterns
ACCESSES_BIN=false
ACCESSES_SUBAGENT_SCRIPTS=false
ACCESSES_MASTER_SCRIPTS=false

# For file operations (Read/Write/Edit/Glob/Grep), check the actual path
FILE_PATHS="$FILE_PATH $PATH_ARG"

# For Bash commands, extract executable paths (starting with ./ or / or bare path)
# This avoids false positives from text in arguments like commit messages
EXEC_PATH=""
if [[ -n "$COMMAND" ]]; then
	# Extract first word that looks like an executable path
	EXEC_PATH=$(echo "$COMMAND" | grep -oE '(^|[[:space:]])(\.?/[^[:space:]]+)' | head -1 | xargs)
fi

# Check bin/ access
if [[ "$EXEC_PATH" == *"/bin/"* ]] || [[ "$FILE_PATHS" == *"/bin/"* ]] || \
   [[ "$COMMAND" == bin/* ]] || [[ "$FILE_PATH" == bin/* ]] || [[ "$PATH_ARG" == bin/* ]]; then
	ACCESSES_BIN=true
fi

# Check sub-agent/scripts/ access - only actual path access, not text
# Patterns cover: absolute paths, relative .claude/ paths (direct, quoted, wrapped)
if [[ "$EXEC_PATH" == *"/sub-agent/scripts/"* ]] || \
   [[ "$FILE_PATHS" == *"/sub-agent/scripts/"* ]] || \
   [[ "$COMMAND" == *".claude/"*"sub-agent/scripts/"* ]]; then
	ACCESSES_SUBAGENT_SCRIPTS=true
fi

# Check master-agent/scripts/ access - only actual path access, not text
# Patterns cover: absolute paths, relative .claude/ paths (direct, quoted, wrapped)
if [[ "$EXEC_PATH" == *"/master-agent/scripts/"* ]] || \
   [[ "$FILE_PATHS" == *"/master-agent/scripts/"* ]] || \
   [[ "$COMMAND" == *".claude/"*"master-agent/scripts/"* ]]; then
	ACCESSES_MASTER_SCRIPTS=true
fi

# If not accessing any restricted path, allow
if [[ "$ACCESSES_BIN" != "true" ]] && \
   [[ "$ACCESSES_SUBAGENT_SCRIPTS" != "true" ]] && \
   [[ "$ACCESSES_MASTER_SCRIPTS" != "true" ]]; then
	exit 0
fi

# Get current context
CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
CONTEXT=$("$CTX_MGR/get-context.sh" 2>/dev/null)

# Default to master-agent if context manager not available (safe default)
if [[ -z "$CONTEXT" ]]; then
	CONTEXT="master-agent"
fi

# Enforce access rules
BLOCKED_REASON=""

# bin/ → subagent only
if [[ "$ACCESSES_BIN" == "true" ]] && [[ "$CONTEXT" != "subagent" ]]; then
	BLOCKED_REASON="bin/ directory is restricted to subagents (crypto tools)"
fi

# sub-agent/scripts/ → subagent only
if [[ "$ACCESSES_SUBAGENT_SCRIPTS" == "true" ]] && [[ "$CONTEXT" != "subagent" ]]; then
	BLOCKED_REASON="sub-agent/scripts/ is restricted to subagents"
fi

# master-agent/scripts/ → master-agent only
if [[ "$ACCESSES_MASTER_SCRIPTS" == "true" ]] && [[ "$CONTEXT" != "master-agent" ]]; then
	BLOCKED_REASON="master-agent/scripts/ is restricted to master-agent"
fi

# Block if violation detected
if [[ -n "$BLOCKED_REASON" ]]; then
	cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Access denied                                                   ║
║  Context: $CONTEXT
║  Reason: $BLOCKED_REASON
╚═══════════════════════════════════════════════════════════════════════════════╝
BLOCKED
	exit 2
fi

exit 0
