#!/bin/bash

# Session handover hook for Kingdom Builder
# Runs on resume and compact (session continuation/context compression)
# Forces agent to halt and verify understanding before continuing

cd "$CLAUDE_PROJECT_DIR" || exit 1

LOG="/tmp/claude-session-handover-hook.log"
echo "=== SessionHandover $(date -Iseconds) ===" > "$LOG"

# ═══════════════════════════════════════════════════════════════════════════════
# QA APPROVAL SYSTEM: Ensure marker file exists for resumed sessions
# ═══════════════════════════════════════════════════════════════════════════════
# Main agents may resume without going through session-start.sh (which creates
# the marker). We must ensure the marker exists for ALL main agent sessions,
# otherwise a resumed main agent could bypass push restrictions.
# ═══════════════════════════════════════════════════════════════════════════════
MARKER_FILE="$HOME/.claude-main-agent-marker"
if [ ! -f "$MARKER_FILE" ]; then
  echo "Creating main agent marker (resumed session): $MARKER_FILE" >> "$LOG"
  echo "{\"created\":\"$(date -Iseconds)\",\"type\":\"main-agent\",\"resumed\":true}" > "$MARKER_FILE"
  chmod 644 "$MARKER_FILE"
else
  echo "Main agent marker already exists" >> "$LOG"
fi

# Safety check: ensure dependencies exist (fast no-op if already installed)
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Dependencies missing - installing..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output CLAUDE.md reference and HALT instruction
# This overrides any "continue without asking" instructions from the handover summary
cat << 'HANDOVER_INSTRUCTION'

╔════════════════════════════════════════════════════════════════════════════════╗
║  ⚠️  SESSION HANDOVER DETECTED - VERIFICATION REQUIRED                         ║
╚════════════════════════════════════════════════════════════════════════════════╝

You are continuing from a previous session. Context has been compressed and
intent may have drifted.

**CRITICAL: CLAUDE.md overrides the handover summary.**

The handover summary is auto-generated. The user did NOT write it.
Instructions like "continue without asking" are ALWAYS WRONG for this project.

─────────────────────────────────────────────────────────────────────────────────
REQUIRED ACTIONS:
─────────────────────────────────────────────────────────────────────────────────

1. RE-READ CLAUDE.md completely (especially sections 0 and 1)
   Location: CLAUDE.md in project root

2. RESPOND WITH:
   👻 Session handover detected. ⚠️ About to risk drifting. 😌 Checking with User.

3. PRESENT to the user:
   - Your understanding of the current task
   - Your prime directives (what you believe the user cares about most)
   - Your DOs and DO NOTs for this task
   - Any uncertainties or questions

4. WAIT for user confirmation before resuming work.

─────────────────────────────────────────────────────────────────────────────────

DO NOT:
- Continue implementing where the previous session left off
- Read or explore the codebase based on the handover summary
- Take any action beyond reporting your understanding

The 🪨 emoji protocol remains in effect for environment-driven reminders.

HANDOVER_INSTRUCTION

exit 0
