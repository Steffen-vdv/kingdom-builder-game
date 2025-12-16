#!/bin/bash
# PostToolUse hook for Task - outputs dispatch and response directly
# No file indirection needed - tool_input is available here

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // "unknown"')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // "N/A"')
RESPONSE=$(echo "$INPUT" | jq -r '.tool_result // "N/A"')

# Output mandatory instruction with embedded content
cat << EOF

╔══════════════════════════════════════════════════════════════════════════════╗
║  MANDATORY: TRANSPARENT DISPATCH PROTOCOL                                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

You MUST output the following to the user before summarizing or proceeding:

**Dispatching ${SUBAGENT}:**
\`\`\`
${PROMPT}
\`\`\`

**${SUBAGENT} response:**
\`\`\`
${RESPONSE}
\`\`\`

EOF
