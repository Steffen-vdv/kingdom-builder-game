#!/bin/bash

# ASYNC MODE: Output JSON first line to run in background with 5min timeout
echo '{"async": true, "asyncTimeout": 300000}'

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd to $CLAUDE_PROJECT_DIR" >> "$LOG"; exit 1; }

# Install dependencies if needed
# Use npm ci (faster, uses lockfile exactly) with --prefer-offline (use cache)
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies (npm ci --prefer-offline)..." >> "$LOG"
  npm ci --prefer-offline >> "$LOG" 2>&1 || {
    echo "npm ci failed, falling back to npm install..." >> "$LOG"
    npm install >> "$LOG" 2>&1 || { echo "npm install failed" >> "$LOG"; exit 1; }
  }
fi

# Initialize Husky if needed
if [ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ]; then
  echo "Initializing Husky..." >> "$LOG"
  npm run prepare >> "$LOG" 2>&1
fi

# Only rebuild better-sqlite3 if the binary doesn't exist
SQLITE_BINARY="$CLAUDE_PROJECT_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
if [ ! -f "$SQLITE_BINARY" ]; then
  echo "Rebuilding better-sqlite3 (binary missing)..." >> "$LOG"
  npm rebuild better-sqlite3 >> "$LOG" 2>&1
else
  echo "better-sqlite3 binary already exists, skipping rebuild" >> "$LOG"
fi

# Copy settings to root location (workaround for PreToolUse hooks)
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"
exit 0
