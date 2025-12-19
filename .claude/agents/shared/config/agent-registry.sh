#!/bin/bash
#
# agent-registry.sh — Single source of truth for agent-signature type mappings
#
# This file is the canonical source for:
#   - Valid agent identifiers
#   - Agent → signature type mappings
#   - Valid signature types
#
# Sourced by: sign.sh, qa-hook-lib.sh
#
# IMPORTANT: When adding a new agent, update this file ONLY.
# All validation scripts will automatically pick up the change.
#

# Agent identifier → signature type mapping
# Phase 1 reviewers (6 agents)
declare -A AGENT_SIG_TYPES=(
	["review-ci-tests-required"]="QA_CI_REQUIRED_TESTS"
	["review-claims-auditor"]="QA_CLAIMS_AUDITOR"
	["review-contracts-boundaries"]="QA_CONTRACTS_BOUNDARIES"
	["review-mechanics-content"]="QA_MECHANICS_CONTENT"
	["review-infra-concurrency"]="QA_INFRA_CONCURRENCY"
	["review-tests-docs-dry"]="QA_TESTS_DOCS_DRY"
	# Phase 2 aggregator
	["review-lead"]="QA_FINAL_SIGNATORY"
)

# Derive valid agents list (pipe-separated for regex matching)
# Note: safe-deployment-gate is NOT included - it doesn't write JSON output
VALID_AGENTS=$(IFS='|'; echo "${!AGENT_SIG_TYPES[*]}" | tr ' ' '|')

# Derive valid signature types list (pipe-separated for regex matching)
VALID_SIG_TYPES=$(printf '%s\n' "${AGENT_SIG_TYPES[@]}" | sort -u | tr '\n' '|' | sed 's/|$//')

# Helper function: get expected signature type for an agent
# Usage: get_sig_type_for_agent "review-claims-auditor"
# Returns: QA_CLAIMS_AUDITOR (or empty if agent not found)
get_sig_type_for_agent() {
	local agent="$1"
	echo "${AGENT_SIG_TYPES[$agent]:-}"
}

# Helper function: check if agent identifier is valid
# Usage: is_valid_agent "review-claims-auditor" && echo "valid"
is_valid_agent() {
	local agent="$1"
	[[ -n "${AGENT_SIG_TYPES[$agent]:-}" ]]
}

# Helper function: check if signature type is valid
# Usage: is_valid_sig_type "QA_CLAIMS_AUDITOR" && echo "valid"
is_valid_sig_type() {
	local sig_type="$1"
	for type in "${AGENT_SIG_TYPES[@]}"; do
		[[ "$type" == "$sig_type" ]] && return 0
	done
	return 1
}
