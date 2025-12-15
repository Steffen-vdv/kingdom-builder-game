#!/bin/bash

# Block direct execution of setup scripts
# These scripts should ONLY be invoked via hooks, not by agents directly
#
# Security: Prevents agents from manually running setup scripts
# to bypass the intended security model.

COMMAND="${TOOL_INPUT_COMMAND:-}"

# Check if the command tries to run our protected scripts (obfuscated names)
if [[ "$COMMAND" == *"mss.sh"* ]] || \
   [[ "$COMMAND" == *"sss.sh"* ]] || \
   [[ "$COMMAND" == *"msh.sh"* ]]; then

  cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Protected scripts cannot be run directly                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

These scripts are part of the security model and can only be invoked via hooks.
Direct execution is not permitted.
BLOCKED
  exit 2
fi

# Not a protected script, allow execution
exit 0
