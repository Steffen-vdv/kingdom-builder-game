#!/bin/bash

# Session handover hook for Kingdom Builder
# Runs on resume/compact - reminds agent to verify context

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

log_session "handover" "SessionHandover"

# Safety check: ensure dependencies exist
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  log_hook "handover" "Dependencies missing - installing..."
  pnpm install --frozen-lockfile >> "$LOG_FILE" 2>&1
fi

[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG_FILE" 2>&1

# Reset context to master-agent (clears any orphaned subagent state from previous session)
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-master-agent.sh"
log_hook "handover" "Context reset to master-agent"

log_session "handover" "SessionHandover" "completed"

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
When dispatching subagents (6 Phase 1 reviewers, review-lead, safe-deployment-gate),
you MUST follow the INPUT/OUTPUT formats defined below.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
