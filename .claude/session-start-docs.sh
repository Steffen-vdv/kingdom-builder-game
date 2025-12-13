#!/bin/bash

# ASYNC MODE: Output JSON first line to run in background with 5min timeout
echo '{"async": true, "asyncTimeout": 300000}'

LOG="/tmp/claude-session-start-hook.log"
STATUS="/tmp/claude-env-status"

# Initialize status file
echo "SETUP_IN_PROGRESS" > "$STATUS"

# Start logging with clear header
cat > "$LOG" << 'HEADER'
╔════════════════════════════════════════════════════════════════════╗
║  KINGDOM BUILDER - Environment Setup                               ║
║  This takes 4-5 minutes. Check status: cat /tmp/claude-env-status  ║
╚════════════════════════════════════════════════════════════════════╝
HEADER
echo "Started: $(date -Iseconds)" >> "$LOG"
echo "" >> "$LOG"

cd "$CLAUDE_PROJECT_DIR" || {
  echo "FAILED" > "$STATUS"
  echo "❌ FAILED to cd to $CLAUDE_PROJECT_DIR" >> "$LOG"
  exit 1
}

# Step 1: Install dependencies
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "📦 [1/3] Installing dependencies (npm ci)..." >> "$LOG"
  npm ci --prefer-offline >> "$LOG" 2>&1 || {
    echo "   ⚠️  npm ci failed, trying npm install..." >> "$LOG"
    npm install >> "$LOG" 2>&1 || {
      echo "FAILED" > "$STATUS"
      echo "❌ npm install failed" >> "$LOG"
      exit 1
    }
  }
  echo "   ✅ Dependencies installed" >> "$LOG"
else
  echo "📦 [1/3] Dependencies already installed (skipping)" >> "$LOG"
fi

# Step 2: Initialize Husky
if [ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ]; then
  echo "🐶 [2/3] Initializing Husky git hooks..." >> "$LOG"
  npm run prepare >> "$LOG" 2>&1
  echo "   ✅ Husky initialized" >> "$LOG"
else
  echo "🐶 [2/3] Husky already initialized (skipping)" >> "$LOG"
fi

# Step 3: Rebuild better-sqlite3 if needed
SQLITE_BINARY="$CLAUDE_PROJECT_DIR/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
if [ ! -f "$SQLITE_BINARY" ]; then
  echo "🔧 [3/3] Building better-sqlite3 native bindings..." >> "$LOG"
  npm rebuild better-sqlite3 >> "$LOG" 2>&1
  echo "   ✅ Native bindings built" >> "$LOG"
else
  echo "🔧 [3/3] Native bindings already exist (skipping)" >> "$LOG"
fi

# Copy settings to root location (workaround for PreToolUse hooks)
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

# Mark as complete
echo "READY" > "$STATUS"

cat >> "$LOG" << FOOTER

╔════════════════════════════════════════════════════════════════════╗
║  ✅ SETUP COMPLETE - Environment is ready                          ║
║  You can now run tests, typecheck, and commit                      ║
╚════════════════════════════════════════════════════════════════════╝
Completed: $(date -Iseconds)
FOOTER

exit 0
