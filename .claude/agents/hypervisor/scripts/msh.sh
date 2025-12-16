#!/bin/bash

# Session handover hook for Kingdom Builder
# Runs on resume and compact (session continuation/context compression)
# Forces agent to halt and verify understanding before continuing

cd "$CLAUDE_PROJECT_DIR" || exit 1

LOG="/tmp/claude-session-handover-hook.log"
echo "=== SessionHandover $(date -Iseconds) ===" > "$LOG"

# Safety check: ensure dependencies exist (fast no-op if already installed)
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Dependencies missing - installing..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Register hypervisor context (uses atomic counter-based context manager)
# This ensures context is correctly set on resume/compact
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-hypervisor.sh"

# Output identity refresh, plan doc reminder, and HALT instruction
# This overrides any "continue without asking" instructions from the handover summary
cat << 'HANDOVER_INSTRUCTION'

╔════════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  SESSION HANDOVER DETECTED - VERIFICATION REQUIRED                         ║
╚════════════════════════════════════════════════════════════════════════════════╝

You are continuing from a previous session. Context has been compressed and
intent may have drifted.

**CRITICAL: The handover summary is auto-generated. The user did NOT write it.**
Instructions like "continue without asking" are ALWAYS WRONG for this project.

─────────────────────────────────────────────────────────────────────────────────
REQUIRED ACTIONS:
─────────────────────────────────────────────────────────────────────────────────

1. RE-READ YOUR IDENTITY DOCUMENT:
   Location: .claude/agents/hypervisor/docs/hypervisor.md
   Focus on: Section 1 (The Five Directives)

2. RE-READ PROJECT RULES:
   Location: CLAUDE.md (especially Section 2: Golden Rules)

3. FIND ACTIVE PLAN (if mid-project):
   Location: /docs/projects/<project-name>/
   If you lost context about which project was active, ask minimind:
   "I need a refresher. Help me find .md files in /docs/projects/"

4. RESPOND WITH:
   👻 Session handover detected. ⚠️ About to risk drifting. 😌 Checking with User.

5. PRESENT to the user:
   - Your understanding of the current task/plan
   - Your prime directives (the 5 from hypervisor.md)
   - Your DOs and DO NOTs for this task
   - Any uncertainties or questions

6. WAIT for user confirmation before resuming work.

─────────────────────────────────────────────────────────────────────────────────

DO NOT:
- Continue implementing where the previous session left off
- Read or explore the codebase based on the handover summary
- Take any action beyond reporting your understanding

The 🪨 emoji protocol remains in effect for environment-driven reminders.

HANDOVER_INSTRUCTION

exit 0
