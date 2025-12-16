#!/bin/bash

# Session start hook for Kingdom Builder
# Runs on first session start (startup matcher)
# Installs dependencies, downloads crypto-gate, and injects CLAUDE.md for agent context

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

# ═══════════════════════════════════════════════════════════════════════════════
# NOTE: crypto-gate is NOT downloaded here for the hypervisor.
# Only subagents get crypto-gate via SubagentStart hook → sss.sh
# This is a security measure to prevent the hypervisor from signing approvals.
# ═══════════════════════════════════════════════════════════════════════════════

# Set agent type marker (hypervisor)
echo -n "m_7x9" > "$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"

# Copy settings to root location
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output hypervisor.md for hypervisor identity
echo ""
echo "=== Hypervisor Identity ==="
echo "You are the hypervisor. Read your identity document before starting any task."
echo "Location: $CLAUDE_PROJECT_DIR/.claude/agents/hypervisor/docs/hypervisor.md"
echo ""

exit 0
