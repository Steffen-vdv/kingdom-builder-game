#!/bin/bash
#
# agent-registry.sh — Agent-signature type mappings (loaded from JSON config)
#
# This file loads agent configuration from config/qa-agents.json
# and provides helper functions for validation.
#
# IMPORTANT: When adding a new agent, update config/qa-agents.json ONLY.
#

# Load from JSON config
_CONFIG="${CLAUDE_PROJECT_DIR:-.}/.claude/config/qa-agents.json"

# Build signature type mapping from JSON
declare -A AGENT_SIG_TYPES
while IFS='=' read -r agent sig_type; do
	AGENT_SIG_TYPES["$agent"]="$sig_type"
done < <(jq -r '.signature_types | to_entries[] | "\(.key)=\(.value)"' "$_CONFIG" 2>/dev/null)

# Derive valid agents list (pipe-separated for regex matching)
VALID_AGENTS=$(jq -r '.signature_types | keys | join("|")' "$_CONFIG" 2>/dev/null)

# Derive valid signature types list (pipe-separated for regex matching)
VALID_SIG_TYPES=$(jq -r '.signature_types | values | unique | join("|")' "$_CONFIG" 2>/dev/null)

# Helper function: get expected signature type for an agent
get_sig_type_for_agent() {
	local agent="$1"
	echo "${AGENT_SIG_TYPES[$agent]:-}"
}

# Helper function: check if agent identifier is valid
is_valid_agent() {
	local agent="$1"
	[[ -n "${AGENT_SIG_TYPES[$agent]:-}" ]]
}

# Helper function: check if signature type is valid
is_valid_sig_type() {
	local sig_type="$1"
	for type in "${AGENT_SIG_TYPES[@]}"; do
		[[ "$type" == "$sig_type" ]] && return 0
	done
	return 1
}
