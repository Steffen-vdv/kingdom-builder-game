#!/bin/bash

# Restrict EXECUTION based on agent context:
# - bin/                         → subagent only (crypto tools)
# - sub-agent/scripts/           → subagent only (sign.sh, verify scripts)
# - master-agent/scripts/        → master-agent only (session hooks)
# - .claude/hooks/               → NOBODY (system-invoked only)
#
# NOTE: Read/Write/Edit/Glob/Grep are ALLOWED for all directories.
# Only EXECUTION (Bash) is restricted for security purposes.
#
# IMPORTANT: We only block EXECUTION of scripts in these directories.
# Commands like `rm .claude/hooks/file.sh` are ALLOWED because `rm` is the
# executable, not the hook file. The hook file is just an argument.

SCRIPTS_DIR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts"

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse the tool input
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# =============================================================================
# BLOCK DIRECT WRITES TO QA INPUT FILE (master-agent must use qa-prepare.sh)
# =============================================================================

if [[ "$TOOL_NAME" == "Write" ]]; then
	FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

	# Block writes to /tmp/claude/qa/current/input.json
	if [[ "$FILE_PATH" == "/tmp/claude/qa/current/input.json" ]]; then
		cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Direct write to QA input file not allowed                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

You cannot write directly to /tmp/claude/qa/current/input.json.

Use the preparation script instead:

  .claude/agents/shared/scripts/qa-prepare.sh --summary "Description..."

This ensures proper structure with prompts and summary fields.

BLOCKED
		exit 2
	fi
	exit 0
fi

# Only restrict Bash execution - allow all file operations
if [[ "$TOOL_NAME" != "Bash" ]]; then
	exit 0
fi

if [[ -z "$COMMAND" ]]; then
	exit 0
fi

# Parse the command using the command package
PARSED=$(echo "$COMMAND" | PYTHONPATH="$SCRIPTS_DIR" python3 -m command 2>/dev/null)

# Extract executable from parsed output
EXECUTABLE=$(echo "$PARSED" | jq -r '.executable // empty' 2>/dev/null)

# If parse failed or no executable, allow (fail open for safety)
if [[ -z "$EXECUTABLE" ]]; then
	exit 0
fi

# Handle shell invocations: bash/sh <script> → check the script path
if [[ "$EXECUTABLE" == "bash" ]] || [[ "$EXECUTABLE" == "sh" ]]; then
	# Get first positional argument (the script being executed)
	SCRIPT_ARG=$(echo "$PARSED" | jq -r '.positional[0] // empty' 2>/dev/null)
	if [[ -n "$SCRIPT_ARG" ]]; then
		EXECUTABLE="$SCRIPT_ARG"
	fi
fi

# Check what's being executed
EXECUTES_BIN=false
EXECUTES_SUBAGENT_SCRIPTS=false
EXECUTES_MASTER_SCRIPTS=false
EXECUTES_HOOKS=false

# Check bin/ execution (crypto tools)
if [[ "$EXECUTABLE" == *"/bin/"* ]] || [[ "$EXECUTABLE" == bin/* ]]; then
	EXECUTES_BIN=true
fi

# Check sub-agent/scripts/ execution
if [[ "$EXECUTABLE" == *"/sub-agent/scripts/"* ]] || \
   [[ "$EXECUTABLE" == *".claude/"*"sub-agent/scripts/"* ]] || \
   [[ "$EXECUTABLE" == .claude/agents/sub-agent/scripts/* ]]; then
	EXECUTES_SUBAGENT_SCRIPTS=true
fi

# Check master-agent/scripts/ execution
if [[ "$EXECUTABLE" == *"/master-agent/scripts/"* ]] || \
   [[ "$EXECUTABLE" == *".claude/"*"master-agent/scripts/"* ]] || \
   [[ "$EXECUTABLE" == .claude/agents/master-agent/scripts/* ]]; then
	EXECUTES_MASTER_SCRIPTS=true
fi

# Check .claude/hooks/ EXECUTION - hooks are system-invoked only
if [[ "$EXECUTABLE" == *"/.claude/hooks/"* ]] || \
   [[ "$EXECUTABLE" == *".claude/hooks/"* ]] || \
   [[ "$EXECUTABLE" == .claude/hooks/* ]]; then
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
