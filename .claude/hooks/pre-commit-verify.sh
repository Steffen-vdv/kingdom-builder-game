#!/bin/bash
#
# PreToolUse hook for git commit verification
#
# State machine:
#   No state file    → Block + show reminder + create state file
#   State file exists → Allow + delete state file (reset for next commit)
#
# This ensures agents are reminded once per commit cycle.
#
# IMPORTANT:
# - Tool input comes via STDIN as JSON (not environment variable)
# - Command is at .tool_input.command
# - Exit 0 = allow, Exit 2 = block
# - Blocked message goes to STDERR

# Debug logging
LOG="/tmp/claude-precommit-hook.log"
echo "=== PreToolUse hook called $(date -Iseconds) ===" >> "$LOG"

# Read tool input from stdin (this is how Claude Code passes it)
JSON_INPUT=$(cat)
echo "JSON_INPUT: $JSON_INPUT" >> "$LOG"

# Parse command from tool input JSON - note: .tool_input.command, not .command
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
echo "Parsed COMMAND: $COMMAND" >> "$LOG"

# Only intercept git commit commands - allow everything else through
if [[ ! "$COMMAND" == *"git commit"* ]]; then
	echo "Not a git commit command, allowing through" >> "$LOG"
	exit 0
fi

echo "Git commit detected!" >> "$LOG"

# Use a stable state file path that persists across tool calls
STATE_FILE="$HOME/.claude-commit-reminder-state"
echo "STATE_FILE: $STATE_FILE" >> "$LOG"
echo "State file exists: $([ -f "$STATE_FILE" ] && echo YES || echo NO)" >> "$LOG"

# Check if we've already shown the reminder (state file exists)
if [[ -f "$STATE_FILE" ]]; then
	# Already reminded - allow this attempt and reset state
	echo "State file exists - allowing commit (second attempt)" >> "$LOG"
	rm -f "$STATE_FILE"
	exit 0
fi

# First attempt - create state file and block
echo "First attempt - creating state file and BLOCKING (exit 2)" >> "$LOG"
touch "$STATE_FILE"

# Output message to STDERR (shown to agent when blocked)
# Exit code 2 = block the tool
cat >&2 << 'EOF'
⚠️ COMMIT BLOCKED — Verification Required

Before committing, complete these steps:

1. RE-READ CLAUDE.md sections 2.1–2.6 (Core Principles)

2. REVIEW all changes since origin/main:
   git diff origin/main --stat
   git diff origin/main

3. For EACH change, VERIFY:
   □ Root cause addressed — not a band-aid (2.6)
   □ Correct architectural layer (2.6)
   □ No fallbacks/defaults masking bad data (2.1)
   □ No hardcoded game data (2.3)
   □ No CResource.*/CAction.* in filter logic (2.3)
   □ No custom UI text (Section 8)
   □ Tests included if new functionality (Section 9)

4. If UNCERTAIN — ASK the user before proceeding.

After completing verification, retry your commit.
EOF

echo "Block message sent to stderr, exiting with code 2" >> "$LOG"
exit 2
