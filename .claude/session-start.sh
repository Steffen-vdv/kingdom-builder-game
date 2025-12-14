#!/bin/bash

# Session start hook for Kingdom Builder
# Runs on first session start (startup matcher)
# Installs dependencies and injects CLAUDE.md for agent context
#
# IMPORTANT: This hook runs ONLY for main task agents, NOT for subagents.
# This asymmetry is used by the MCP-based QA approval system to distinguish
# main agents from QA subagents.

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

# ═══════════════════════════════════════════════════════════════════════════════
# QA APPROVAL SYSTEM: Poison the signing secret for main agents
# ═══════════════════════════════════════════════════════════════════════════════
# The QA_SIGNING_SECRET is provided via cloud environment to ALL agents.
# By unsetting it here (which only runs for main agents), we ensure:
#   - Main agents: QA_SIGNING_SECRET is empty/unset (cannot sign approvals)
#   - QA subagents: QA_SIGNING_SECRET remains intact (can sign approvals)
#
# This prevents main agents from bypassing QA review by calling the MCP tool
# directly - they won't have the secret required to sign.
# ═══════════════════════════════════════════════════════════════════════════════
if [[ -n "$QA_SIGNING_SECRET" ]]; then
  echo "Poisoning QA_SIGNING_SECRET for main agent session" >> "$LOG"
  unset QA_SIGNING_SECRET
  export QA_SIGNING_SECRET=""
fi

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Install dependencies (pnpm-lock.yaml is committed, no conversion needed)
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies with pnpm..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

# Copy settings to root location
cp "$CLAUDE_PROJECT_DIR/.claude/settings.json" /root/.claude/settings.json 2>/dev/null

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output CLAUDE.md content for agent context
# This ensures the agent has the operating manual on fresh session start
echo ""
echo "=== CLAUDE.md Operating Manual ==="
echo "Read this file before starting any task."
echo "Location: $CLAUDE_PROJECT_DIR/CLAUDE.md"
echo ""

exit 0
