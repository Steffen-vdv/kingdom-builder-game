#!/bin/bash

# Session start hook for Kingdom Builder
#
# With full internet: pnpm completes in ~20-30 seconds (sync mode)
# Without full internet: falls back to npm with async mode (~4-5 min)

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Check if we need to install
if [ -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "node_modules exists, skipping install" >> "$LOG"
else
  echo "Installing dependencies..." >> "$LOG"

  # Try pnpm first (fast: ~17s with full internet)
  if pnpm install --frozen-lockfile >> "$LOG" 2>&1; then
    echo "pnpm succeeded" >> "$LOG"
  else
    echo "pnpm failed, using npm (async mode)..." >> "$LOG"
    # Output async JSON to stdout for Claude Code to detect
    # This allows the long npm install to run in background
    echo '{"async": true, "asyncTimeout": 300000}'
    npm ci --prefer-offline >> "$LOG" 2>&1 || npm install >> "$LOG" 2>&1
  fi
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && npm run prepare >> "$LOG" 2>&1

# Rebuild better-sqlite3 only if binary missing
SQLITE_BINARY="$CLAUDE_PROJECT_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
[ ! -f "$SQLITE_BINARY" ] && npm rebuild better-sqlite3 >> "$LOG" 2>&1

# Copy settings to root location
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"
exit 0
