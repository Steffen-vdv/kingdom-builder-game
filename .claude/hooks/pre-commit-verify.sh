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

# Parse command from tool input JSON
COMMAND=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.command' 2>/dev/null || echo "")

# Only intercept git commit commands - allow everything else through
if [[ ! "$COMMAND" == *"git commit"* ]]; then
	exit 0
fi

# Use a stable state file path that persists across tool calls
STATE_FILE="$HOME/.claude-commit-reminder-state"

# Check if we've already shown the reminder (state file exists)
if [[ -f "$STATE_FILE" ]]; then
	# Already reminded - allow this attempt and reset state
	rm -f "$STATE_FILE"
	exit 0
fi

# First attempt - create state file and block with JSON response
touch "$STATE_FILE"

# Output JSON to actually block the tool call
# The reason will be shown to the agent
cat << 'EOF'
{
  "decision": "block",
  "reason": "⚠️ COMMIT BLOCKED — Verification Required\n\nBefore committing, complete these steps:\n\n1. RE-READ CLAUDE.md sections 2.1–2.6 (Core Principles)\n\n2. REVIEW all changes since origin/main:\n   git diff origin/main --stat\n   git diff origin/main\n\n3. For EACH change, VERIFY:\n   □ Root cause addressed — not a band-aid (2.6)\n   □ Correct architectural layer (2.6)\n   □ No fallbacks/defaults masking bad data (2.1)\n   □ No hardcoded game data (2.3)\n   □ No CResource.*/CAction.* in filter logic (2.3)\n   □ No custom UI text (Section 8)\n   □ Tests included if new functionality (Section 9)\n\n4. If UNCERTAIN — ASK the user before proceeding.\n\nAfter completing verification, retry your commit."
}
EOF

exit 0
