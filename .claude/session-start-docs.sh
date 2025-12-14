#!/bin/bash

# Session start hook for Kingdom Builder
# Requires full internet access - uses pnpm for fast installs (~20-30s total)

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Install dependencies if needed (pnpm: ~17s with full internet)
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies with pnpm..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && npm run prepare >> "$LOG" 2>&1

# Rebuild better-sqlite3 only if binary missing (prebuild-install should handle it)
SQLITE_BINARY="$CLAUDE_PROJECT_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
[ ! -f "$SQLITE_BINARY" ] && npm rebuild better-sqlite3 >> "$LOG" 2>&1

# Copy settings to root location
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"
exit 0
