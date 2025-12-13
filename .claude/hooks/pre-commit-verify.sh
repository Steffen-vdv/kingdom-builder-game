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
# IMPORTANT: Must output JSON to actually block. Plain text is ignored by Claude Code.

# Debug logging
LOG="/tmp/claude-precommit-hook.log"
echo "=== PreToolUse hook called $(date -Iseconds) ===" >> "$LOG"
echo "CLAUDE_TOOL_INPUT: $CLAUDE_TOOL_INPUT" >> "$LOG"

# Parse command from tool input JSON
COMMAND=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.command' 2>/dev/null || echo "")
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

# First attempt - create state file and block with JSON response
echo "First attempt - creating state file and BLOCKING" >> "$LOG"
touch "$STATE_FILE"

# Output JSON to actually block the tool call
# The reason will be shown to the agent
cat << 'EOF'
{
  "decision": "block",
  "reason": "⚠️ COMMIT BLOCKED — Verification Required\n\nBefore committing, complete these steps:\n\n1. RE-READ CLAUDE.md sections 2.1–2.6 (Core Principles)\n\n2. REVIEW all changes since origin/main:\n   git diff origin/main --stat\n   git diff origin/main\n\n3. For EACH change, VERIFY:\n   □ Root cause addressed — not a band-aid (2.6)\n   □ Correct architectural layer (2.6)\n   □ No fallbacks/defaults masking bad data (2.1)\n   □ No hardcoded game data (2.3)\n   □ No CResource.*/CAction.* in filter logic (2.3)\n   □ No custom UI text (Section 8)\n   □ Tests included if new functionality (Section 9)\n\n4. If UNCERTAIN — ASK the user before proceeding.\n\nAfter completing verification, retry your commit."
}
EOF

echo "JSON block response output complete" >> "$LOG"
exit 0
