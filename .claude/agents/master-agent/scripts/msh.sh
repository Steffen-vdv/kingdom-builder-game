#!/bin/bash

# Session handover hook for Kingdom Builder
# Runs on resume/compact - reminds agent to verify context

cd "$CLAUDE_PROJECT_DIR" || exit 1

LOG="/tmp/claude-session-handover-hook.log"
echo "=== SessionHandover $(date -Iseconds) ===" > "$LOG"

# Safety check: ensure dependencies exist
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Dependencies missing - installing..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

cat << 'HANDOVER'

╔════════════════════════════════════════════════════════════════════════════════════╗
║  SESSION HANDOVER - Context may have drifted, you may've forgotten crucial details ║
║  about who you are and what you were doing.                                        ║
╚════════════════════════════════════════════════════════════════════════════════════╝

Before continuing:
1. Read your core identity docs immediately: claude/agents/master-agent/docs/master-agent.md
2. Read the core project rules immediately: CLAUDE.md
3. If your last session ended with Task outputs with instructions to you (master-agent), FOLLOW THEM
4. Summarise your status and continue as you were

Project rules: CLAUDE.md

HANDOVER

exit 0
