#!/bin/bash

# Session handover hook for Kingdom Builder
# Runs on resume/compact - reminds agent to verify context

cd "$CLAUDE_PROJECT_DIR" || exit 1

LOG="/tmp/claude-session-handover-hook.log"
echo "=== SessionHandover $(date -Iseconds) ===" > "$LOG"

# Safety check: ensure dependencies exist
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  echo "Dependencies missing - installing..." >> "$LOG"
  pnpm install --frozen-lockfile >> "$LOG" 2>&1
fi

[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG" 2>&1

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"

# Output identity docs (re-injected into agent context on handover)
IDENTITY_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/master-agent/docs/master-agent.md"
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

cat << 'HEADER'
╔════════════════════════════════════════════════════════════════════════════════════╗
║  SESSION HANDOVER - Re-injecting identity and protocol docs                        ║
╚════════════════════════════════════════════════════════════════════════════════════╝

If your last session ended with Task outputs containing instructions to you
(master-agent), FOLLOW THEM after reviewing the re-injected docs below.

=== Master Agent Identity ===
The following is your identity document. You MUST follow these instructions.
Project rules in CLAUDE.md also apply.

HEADER

cat "$IDENTITY_DOC"

cat << 'PROTOCOL_HEADER'

=== Subagent Communication Protocol ===
When dispatching subagents (test-runner, 6 QA reviewers, pusher), you MUST follow
the INPUT/OUTPUT formats defined below. Parse the JSON after ---RESPONSE--- marker.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
