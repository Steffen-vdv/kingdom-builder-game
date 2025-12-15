#!/bin/bash
#
# PreToolUse hook — QA Secret & Session Marker Guard
#
# Security model:
#   - session-start.sh creates a marker file (only runs for main agents)
#   - Main agents (marker exists) CANNOT access QA_SIGNING_SECRET
#   - ALL agents CANNOT touch the marker file (read, write, delete, anything)
#
# This hook intercepts:
#   - Bash commands that reference QA_SIGNING_SECRET (if main agent)
#   - Bash commands that reference the marker file (all agents)
#   - Read/Write/Edit tools targeting the marker file (all agents)
#

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

MARKER_FILE="$HOME/.claude-main-agent-marker"
MARKER_PATTERNS=(
    ".claude-main-agent-marker"
    "claude-main-agent-marker"
)

SECRET_PATTERNS=(
    "QA_SIGNING_SECRET"
    "SIGNING_SECRET"
)

# Patterns that could be used to enumerate/discover env vars
ENV_ENUM_PATTERNS=(
    "printenv"
    " env "
    " env$"
    "^env "
    "^env$"
    'set | grep'
    'export | grep'
    'declare -x'
)

# ═══════════════════════════════════════════════════════════════════════════════
# PARSE INPUT
# ═══════════════════════════════════════════════════════════════════════════════

JSON_INPUT=$(cat)

TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# ═══════════════════════════════════════════════════════════════════════════════
# MARKER FILE PROTECTION (applies to ALL agents)
# ═══════════════════════════════════════════════════════════════════════════════
# No agent may ever touch the marker file. This is a system-only file.

check_marker_access() {
    local target="$1"
    local tool="$2"

    for pattern in "${MARKER_PATTERNS[@]}"; do
        if [[ "$target" == *"$pattern"* ]]; then
            cat >&2 << 'MARKER_BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 ACCESS DENIED — Session Marker Protected                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The session marker file is a system-only file and cannot be accessed by agents.

This file is used to distinguish main agents from subagents for security purposes.
Any attempt to read, write, delete, or otherwise interact with this file is blocked.
MARKER_BLOCKED
            exit 2
        fi
    done
}

# Check for marker access in file operations
if [[ "$TOOL_NAME" == "Read" || "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Edit" ]]; then
    if [[ -n "$FILE_PATH" ]]; then
        check_marker_access "$FILE_PATH" "$TOOL_NAME"
    fi
fi

# Check for marker access in Bash commands
if [[ "$TOOL_NAME" == "Bash" && -n "$COMMAND" ]]; then
    check_marker_access "$COMMAND" "Bash"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SECRET ACCESS PROTECTION (applies to ALL agents)
# ═══════════════════════════════════════════════════════════════════════════════
# NO agent may access QA_SIGNING_SECRET via bash commands.
# This prevents:
#   - Main agents from forging signatures
#   - Subagents from leaking secrets back to main agent via output
#
# The ONLY way to use the secret is via MCP tools which read from env internally.

if [[ "$TOOL_NAME" == "Bash" && -n "$COMMAND" ]]; then
    # Check for direct secret references (blocks ALL agents)
    for pattern in "${SECRET_PATTERNS[@]}"; do
        if [[ "$COMMAND" == *"$pattern"* ]]; then
            cat >&2 << 'SECRET_BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 ACCESS DENIED — QA Signing Secret Protected                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

No agent may access the QA signing secret via bash commands.

The secret is only accessible internally by MCP tools.
This prevents secret leakage through command output.

To sign approvals: Use mcp__qa_approval__sign_approval (QA subagent only)
To push code: Use mcp__qa_approval__verify_and_push (Pusher subagent only)
SECRET_BLOCKED
            exit 2
        fi
    done

    # ───────────────────────────────────────────────────────────────────────────
    # BASH INDIRECTION PROTECTION
    # ───────────────────────────────────────────────────────────────────────────
    # Block bash features that can access variables indirectly, bypassing the
    # literal string check above. This is a structural fix - we block the
    # language features that enable indirection rather than playing whack-a-mole
    # with specific bypass patterns.
    #
    # Blocked patterns:
    #   ${!VAR}     - bash indirect variable expansion
    #   eval        - arbitrary command execution (can construct variable names)
    # ───────────────────────────────────────────────────────────────────────────

    # Block bash indirect expansion: ${!...}
    if [[ "$COMMAND" =~ \$\{! ]]; then
        cat >&2 << 'INDIRECTION_BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 ACCESS DENIED — Bash Indirect Expansion Blocked                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Bash indirect variable expansion (${!VAR}) is not permitted.

This feature can be used to access protected environment variables indirectly.
If you have a legitimate need for this syntax, ask the user for guidance.
INDIRECTION_BLOCKED
        exit 2
    fi

    # Block eval command (can construct and execute arbitrary variable access)
    if [[ "$COMMAND" =~ (^|[[:space:];|&])eval([[:space:]]|$) ]]; then
        cat >&2 << 'EVAL_BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 ACCESS DENIED — Eval Command Blocked                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The eval command is not permitted.

Eval can be used to construct and access protected variables dynamically.
If you have a legitimate need for eval, ask the user for guidance.
EVAL_BLOCKED
        exit 2
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ENVIRONMENT ENUMERATION PROTECTION (applies only to main agents)
# ═══════════════════════════════════════════════════════════════════════════════
# Main agents cannot enumerate env vars to discover secrets.
# Subagents may need legitimate env access for other purposes.

if [[ -f "$MARKER_FILE" ]]; then
    # This is a main agent — block env enumeration

    if [[ "$TOOL_NAME" == "Bash" && -n "$COMMAND" ]]; then
        for pattern in "${ENV_ENUM_PATTERNS[@]}"; do
            if [[ "$COMMAND" =~ $pattern ]]; then
                cat >&2 << 'ENV_ENUM_BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 ACCESS DENIED — Environment Enumeration Blocked                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Main agents cannot enumerate environment variables.

This prevents discovery of protected secrets.
If you need specific environment information, ask the user.
ENV_ENUM_BLOCKED
                exit 2
            fi
        done
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# ALL CHECKS PASSED
# ═══════════════════════════════════════════════════════════════════════════════

exit 0
