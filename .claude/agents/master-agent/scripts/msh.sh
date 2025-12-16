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

╔════════════════════════════════════════════════════════════════════════════════╗
║  SESSION HANDOVER - Context may have drifted                                   ║
╚════════════════════════════════════════════════════════════════════════════════╝

Before continuing:
1. Briefly summarize your understanding of the current task
2. Ask the user to confirm before proceeding

Identity doc: .claude/agents/master-agent/docs/master-agent.md
Project rules: CLAUDE.md

HANDOVER

exit 0
