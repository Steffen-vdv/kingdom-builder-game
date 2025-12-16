#!/bin/bash

# Session start hook for Kingdom Builder
# Runs on first session start - installs dependencies

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Install dependencies if needed
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies with pnpm..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

# Register master-agent context
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-master-agent.sh"

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output identity reminder
cat << 'IDENTITY'

=== Master Agent ===
You are the master agent with full system access.
Only restriction: git push must go through QA → pusher flow.

Identity doc: .claude/agents/master-agent/docs/master-agent.md
Project rules: CLAUDE.md

IDENTITY

exit 0
