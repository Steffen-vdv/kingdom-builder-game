#!/bin/bash

# Block direct execution of setup scripts
# These scripts should ONLY be invoked via hooks, not by agents directly
#
# Security: Prevents agents from manually running session-start.sh or
# subagent-setup.sh to bypass the intended security model.

COMMAND="${TOOL_INPUT_COMMAND:-}"

# Check if the command tries to run our protected scripts
if [[ "$COMMAND" == *"session-start.sh"* ]] || \
   [[ "$COMMAND" == *"subagent-setup.sh"* ]] || \
   [[ "$COMMAND" == *"session-handover.sh"* ]]; then

  cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Setup scripts cannot be run directly                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The following scripts are protected and can only be invoked via hooks:
  - .claude/session-start.sh      (SessionStart hook only)
  - .claude/session-handover.sh   (SessionStart:resume/compact only)
  - .claude/subagent-setup.sh     (SubagentStart hook only)

These scripts are part of the security model and should not be run manually.
BLOCKED
  exit 2
fi

# Not a protected script, allow execution
exit 0
