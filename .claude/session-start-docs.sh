#!/bin/bash

# Log file for debugging
LOG="/tmp/claude-session-start-hook.log"

# Create marker file FIRST to verify hook execution
echo "SessionStart hook executed at $(date -Iseconds)" > /tmp/claude-session-start-hook.marker

# Start logging
echo "=== SessionStart hook log $(date -Iseconds) ===" > "$LOG"
echo "CLAUDE_PROJECT_DIR=$CLAUDE_PROJECT_DIR" >> "$LOG"

# Change to project directory
cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Wait for node_modules to exist (env-manager runs npm install in parallel)
# Don't run our own npm install - that conflicts with env-manager
echo "Waiting for node_modules (env-manager installs dependencies)..." >> "$LOG"
for i in {1..60}; do
  if [ -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
    echo "node_modules appeared after ${i}s" >> "$LOG"
    break
  fi
  sleep 1
done

if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "ERROR: node_modules never appeared after 60s" >> "$LOG"
  exit 1
fi

# Now initialize Husky if needed (env-manager doesn't do this)
if [ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ]; then
  echo "Running: npm run prepare (to initialize Husky)" >> "$LOG"
  npm run prepare >> "$LOG" 2>&1
  echo "npm run prepare exit code: $?" >> "$LOG"
fi

# Check result
echo ".husky/_ exists after: $([ -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && echo YES || echo NO)" >> "$LOG"

# Rebuild better-sqlite3 native bindings
echo "Running: npm rebuild better-sqlite3" >> "$LOG"
npm rebuild better-sqlite3 >> "$LOG" 2>&1

# Copy project Claude settings to root location (workaround for PreToolUse hooks)
echo "Copying settings.json to /root/.claude/" >> "$LOG"
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json >> "$LOG" 2>&1

echo "=== Hook completed $(date -Iseconds) ===" >> "$LOG"
echo "SessionStart hook completed successfully"

exit 0
