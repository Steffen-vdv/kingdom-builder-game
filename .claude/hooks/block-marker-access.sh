#!/bin/bash

# Block direct manipulation of the agent type marker file
# The marker can only be set by setup hooks (mss.sh, sss.sh)
#
# Security: Prevents agents from faking their identity by
# manipulating the marker file directly.

COMMAND="${TOOL_INPUT_COMMAND:-}"

# Block any command that references the marker file
# The obfuscated name makes false positives extremely unlikely
if [[ "$COMMAND" == *".__ctx_9f8e7d__"* ]]; then
  cat << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Protected system file                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

This file is part of the security infrastructure and cannot be accessed directly.
BLOCKED
  exit 2
fi

# Not accessing marker, allow execution
exit 0
