#!/bin/bash

# Session start hook for Kingdom Builder
# Runs on first session start (startup matcher)
# Installs dependencies and injects CLAUDE.md for agent context

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Install dependencies (pnpm-lock.yaml is committed, no conversion needed)
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies with pnpm..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

# Copy settings to root location
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output CLAUDE.md content for agent context
# This ensures the agent has the operating manual on fresh session start
echo ""
echo "=== CLAUDE.md Operating Manual ==="
echo "Read this file before starting any task."
echo "Location: $CLAUDE_PROJECT_DIR/CLAUDE.md"
echo ""

exit 0
