#!/bin/bash

# Block direct curl/wget downloads from Bash tool
# Downloads MUST go through approved scripts (e.g., subagent-setup.sh)
#
# Security: Prevents agents from downloading arbitrary files outside
# the approved workflow.
#
# Allowed:
#   - curl for API requests (no file output flags)
#   - npm/pnpm install (uses its own download mechanism)
#   - gh CLI (uses authenticated GitHub API)
#   - Downloads within .sh scripts (not intercepted)
#
# Blocked:
#   - curl with -o/-O/--output (file download)
#   - wget (any usage)

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse command from tool input JSON
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Block wget entirely (it's always for downloads)
if [[ "$COMMAND" =~ (^|[[:space:]]|&&|\|)wget($|[[:space:]]) ]]; then
  cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — wget downloads not allowed                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct file downloads via wget are not permitted.

If you need to download something:
  - npm/pnpm packages: use pnpm install
  - GitHub releases: use approved scripts in scripts/
  - Other files: ask the user for guidance

This restriction ensures all downloads go through approved channels.
BLOCKED
  exit 2
fi

# Block curl with download flags
if [[ "$COMMAND" =~ curl.*(-o[[:space:]]|-O|--output) ]]; then
  cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — curl file downloads not allowed                                 ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct file downloads via curl (-o, -O, --output) are not permitted.

If you need to download something:
  - npm/pnpm packages: use pnpm install
  - GitHub releases: use approved scripts in scripts/
  - Other files: ask the user for guidance

Curl for API requests (without file output) is still allowed.
BLOCKED
  exit 2
fi

# Not a blocked download, allow execution
exit 0
