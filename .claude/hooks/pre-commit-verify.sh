#!/bin/bash
#
# PreToolUse hook for git commit verification
#
# State machine:
#   No state file    → Block + show reminder + create state file
#   State file exists → Allow + delete state file (reset for next commit)
#
# This ensures agents are reminded once per commit cycle.

STATE_FILE="/tmp/claude-commit-verified-$$"
# Use a more stable state file path that persists across tool calls
STATE_FILE="$HOME/.claude-commit-reminder-state"

# Check if we've already shown the reminder (state file exists)
if [[ -f "$STATE_FILE" ]]; then
	# Already reminded - allow this attempt and reset state
	rm -f "$STATE_FILE"
	exit 0
fi

# First attempt - create state file and block with reminder
touch "$STATE_FILE"

cat >&2 << 'EOF'
⚠️  COMMIT BLOCKED — Verification Required

Before committing, complete these steps:

1. RE-READ CLAUDE.md sections 2.1–2.6 (Core Principles)
   Use: Read /home/user/kingdom-builder-game/CLAUDE.md

2. REVIEW all changes since origin/main:
   git diff origin/main --stat    # which files changed
   git diff origin/main           # actual changes

3. For EACH change, VERIFY:
   □ Root cause addressed — not a band-aid at the symptom layer (2.6)
   □ Correct architectural layer — content vs engine vs web (2.6)
   □ No fallbacks/defaults masking bad data (2.1)
   □ No hardcoded game data — icons, labels, values from Content (2.3)
   □ No CResource.*/CAction.* in filter/exclusion logic (2.3)
   □ No custom UI text — using translation pipeline (Section 8)
   □ Tests included if new functionality (Section 9)

4. If UNCERTAIN about expected behavior, assumptions, or whether your
   solution aligns with system mechanics — ASK the user before proceeding.
   Skip this step only if you are confident in your understanding.

After completing verification, retry your commit.
EOF

exit 2
