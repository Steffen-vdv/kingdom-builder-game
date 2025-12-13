#!/bin/bash

# MINIMAL TEST: Create marker file FIRST to verify hook execution
# Check with: cat /tmp/claude-session-start-hook.marker
echo "SessionStart hook executed at $(date -Iseconds)" > /tmp/claude-session-start-hook.marker

# If we got here, hook is working. Now do the real work:

# Ensure dependencies and Husky git hooks are properly initialized
if [ ! -d "node_modules" ]; then
  npm install 2>/dev/null || true
elif [ ! -d ".husky/_" ]; then
  npm run prepare 2>/dev/null || true
fi

# Rebuild better-sqlite3 native bindings
npm rebuild better-sqlite3 2>/dev/null || true

# Copy project Claude settings to root location (workaround for PreToolUse hooks)
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null || true

# Output context for the agent
echo "SessionStart hook completed successfully"

exit 0
