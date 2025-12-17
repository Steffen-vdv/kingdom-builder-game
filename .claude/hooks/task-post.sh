#!/bin/bash
# PostToolUse hook for Task - outputs dispatch and response directly

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // "Subagent (type unknown)"')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // "N/A"')
RESPONSE=$(echo "$INPUT" | jq -r '.tool_result // "N/A"')

cat << EOF

╔══════════════════════════════════════════════════════════════════════════════╗
║  MANDATORY INSTRUCTION FOR MASTER-AGENT                                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

You, the master-agent, MUST output the following to the User before summarizing or proceeding:

**Dispatching ${SUBAGENT}:**
\`\`\`
${PROMPT}
\`\`\`

**${SUBAGENT} response:**
\`\`\`
${RESPONSE}
\`\`\`

EOF
