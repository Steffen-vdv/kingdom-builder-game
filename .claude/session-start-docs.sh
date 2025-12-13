#!/bin/bash

# ASYNC MODE: Output JSON first line to run in background with 5min timeout
# This allows npm install to complete without hitting the default 60s timeout
echo '{"async": true, "asyncTimeout": 300000}'

# Log file for debugging
LOG="/tmp/claude-session-start-hook.log"

# Create marker file to verify hook execution
echo "SessionStart hook executed at $(date -Iseconds)" > /tmp/claude-session-start-hook.marker

# Start logging
echo "=== SessionStart hook log $(date -Iseconds) ===" > "$LOG"
echo "CLAUDE_PROJECT_DIR=$CLAUDE_PROJECT_DIR" >> "$LOG"
echo "Running in ASYNC mode (5min timeout)" >> "$LOG"

# Change to project directory
cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }
echo "PWD: $(pwd)" >> "$LOG"

# Install dependencies if needed
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "node_modules missing - running npm install..." >> "$LOG"
  npm install >> "$LOG" 2>&1
  NPM_EXIT=$?
  echo "npm install exit code: $NPM_EXIT" >> "$LOG"
  if [ $NPM_EXIT -ne 0 ]; then
    echo "ERROR: npm install failed!" >> "$LOG"
    exit 1
  fi
else
  echo "node_modules already exists" >> "$LOG"
fi

# Initialize Husky if needed
if [ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ]; then
  echo "Running: npm run prepare (to initialize Husky)" >> "$LOG"
  npm run prepare >> "$LOG" 2>&1
  echo "npm run prepare exit code: $?" >> "$LOG"
else
  echo ".husky/_ already exists" >> "$LOG"
fi

# Verify Husky
echo ".husky/_ exists: $([ -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && echo YES || echo NO)" >> "$LOG"

# Rebuild better-sqlite3 native bindings
echo "Running: npm rebuild better-sqlite3" >> "$LOG"
npm rebuild better-sqlite3 >> "$LOG" 2>&1

# Copy project Claude settings to root location (workaround for PreToolUse hooks)
echo "Copying settings.json to /root/.claude/" >> "$LOG"
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json >> "$LOG" 2>&1

echo "=== Hook completed $(date -Iseconds) ===" >> "$LOG"
exit 0
