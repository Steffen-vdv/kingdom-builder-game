#!/bin/bash

# Log file for debugging
LOG="/tmp/claude-session-start-hook.log"

# Create marker file FIRST to verify hook execution
echo "SessionStart hook executed at $(date -Iseconds)" > /tmp/claude-session-start-hook.marker

# Start logging
echo "=== SessionStart hook log $(date -Iseconds) ===" > "$LOG"
echo "CLAUDE_PROJECT_DIR=$CLAUDE_PROJECT_DIR" >> "$LOG"
echo "PWD before cd: $(pwd)" >> "$LOG"

# Change to project directory (hook may run from different cwd)
cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd to $CLAUDE_PROJECT_DIR" >> "$LOG"; exit 1; }
echo "PWD after cd: $(pwd)" >> "$LOG"

# Check what exists
echo "node_modules exists: $([ -d "$CLAUDE_PROJECT_DIR/node_modules" ] && echo YES || echo NO)" >> "$LOG"
echo ".husky/_ exists: $([ -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && echo YES || echo NO)" >> "$LOG"

# Ensure dependencies and Husky git hooks are properly initialized
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Running: npm install" >> "$LOG"
  npm install >> "$LOG" 2>&1
  echo "npm install exit code: $?" >> "$LOG"
elif [ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ]; then
  echo "Running: npm run prepare" >> "$LOG"
  npm run prepare >> "$LOG" 2>&1
  echo "npm run prepare exit code: $?" >> "$LOG"
else
  echo "Skipping npm commands - both directories exist" >> "$LOG"
fi

# Check again after npm commands
echo ".husky/_ exists after: $([ -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && echo YES || echo NO)" >> "$LOG"

# Rebuild better-sqlite3 native bindings
echo "Running: npm rebuild better-sqlite3" >> "$LOG"
npm rebuild better-sqlite3 >> "$LOG" 2>&1

# Copy project Claude settings to root location (workaround for PreToolUse hooks)
echo "Copying settings.json to /root/.claude/" >> "$LOG"
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>&1 | tee -a "$LOG"

echo "=== Hook completed ===" >> "$LOG"

# Output context for the agent
echo "SessionStart hook completed successfully"

exit 0
