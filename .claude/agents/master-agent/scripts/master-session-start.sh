#!/bin/bash

# Session start hook for Kingdom Builder
# Runs on first session start - installs dependencies

LOG="/tmp/claude-session-start-hook.log"
echo "=== SessionStart $(date -Iseconds) ===" > "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# Install dependencies if needed
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies with pnpm..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

# Register master-agent context
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-master-agent.sh"

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output identity docs (injected into agent context)
IDENTITY_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/master-agent/docs/master-agent.md"
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

cat << 'HEADER'
=== Master Agent Identity ===
The following is your identity document. You MUST follow these instructions.
Project rules in CLAUDE.md also apply.

HEADER

cat "$IDENTITY_DOC"

cat << 'PROTOCOL_HEADER'

=== Subagent Communication Protocol ===
When dispatching subagents (6 Phase 1 reviewers, review-lead, safe-deployment-gate),
you MUST follow the INPUT/OUTPUT formats defined below. All communication is pure JSON.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
