#!/bin/bash

# Session start hook for Kingdom Builder
# Requires full internet - uses pnpm with prebuilt binaries (~20s total)

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Install dependencies
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies with pnpm..." >> "$LOG"

  # Import npm lockfile to pnpm format if needed
  if [ ! -f "$CLAUDE_PROJECT_DIR/pnpm-lock.yaml" ] && [ -f "$CLAUDE_PROJECT_DIR/package-lock.json" ]; then
    echo "Converting package-lock.json to pnpm-lock.yaml..." >> "$LOG"
    pnpm import >> "$LOG" 2>&1
  fi

  # Install with frozen lockfile (now that we have pnpm-lock.yaml)
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && npm run prepare >> "$LOG" 2>&1

# Copy settings to root location
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"
exit 0
