#!/bin/bash
#
# check-prior-state.sh — Check for prior QA state to enable delta review
#
# Usage: check-prior-state.sh '<agent>' '["commit1","commit2"]'
#
# Checks if this agent has a prior signed verdict that can be used
# to speed up review (only analyze new commits instead of full review).
#
# Returns JSON:
#   {"mode":"FULL_REVIEW","reason":"..."}
#   {"mode":"DELTA_REVIEW","prior_verdict":"...","prior_commits":[...],"new_commits":[...]}
#

set -euo pipefail

AGENT="${1:-}"
CURRENT_COMMITS="${2:-}"

if [[ -z "$AGENT" || -z "$CURRENT_COMMITS" ]]; then
	echo '{"mode":"FULL_REVIEW","reason":"missing arguments"}'
	exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CHECK FOR PRIOR STATE FILE
# ═══════════════════════════════════════════════════════════════════════════════

OUTPUT_DIR="/tmp/claude/sub-agents/output"
JSON_FILE="$OUTPUT_DIR/${AGENT}.json"

if [[ ! -f "$JSON_FILE" ]]; then
	echo '{"mode":"FULL_REVIEW","reason":"no prior state"}'
	exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# READ AND VALIDATE PRIOR STATE
# ═══════════════════════════════════════════════════════════════════════════════

# Extract fields from prior JSON
PRIOR_PAYLOAD=$(jq -r '.payload // empty' "$JSON_FILE" 2>/dev/null)
PRIOR_SIGNATURE=$(jq -r '.signature // empty' "$JSON_FILE" 2>/dev/null)
PRIOR_TYPE=$(jq -r '.signature_type // empty' "$JSON_FILE" 2>/dev/null)

if [[ -z "$PRIOR_PAYLOAD" || -z "$PRIOR_SIGNATURE" || -z "$PRIOR_TYPE" ]]; then
	echo '{"mode":"FULL_REVIEW","reason":"prior state missing signature fields"}'
	exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY SIGNATURE
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
CRYPTO_GATE="$PROJECT_DIR/bin/crypto-gate"

if [[ ! -x "$CRYPTO_GATE" ]]; then
	echo '{"mode":"FULL_REVIEW","reason":"crypto-gate not available"}'
	exit 0
fi

if ! "$CRYPTO_GATE" verify "$PRIOR_PAYLOAD" "$PRIOR_SIGNATURE" --type "$PRIOR_TYPE" >/dev/null 2>&1; then
	echo '{"mode":"FULL_REVIEW","reason":"signature verification failed"}'
	exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# COMPARE COMMITS
# ═══════════════════════════════════════════════════════════════════════════════

# Parse prior commits from payload
# Commits are nested under .input.commits, verdict under .verdict.verdict
PRIOR_COMMITS=$(echo "$PRIOR_PAYLOAD" | jq -c '.input.commits // []' 2>/dev/null)
PRIOR_VERDICT=$(echo "$PRIOR_PAYLOAD" | jq -r '.verdict.verdict // empty' 2>/dev/null)

if [[ -z "$PRIOR_COMMITS" || "$PRIOR_COMMITS" == "[]" ]]; then
	echo '{"mode":"FULL_REVIEW","reason":"prior state has no commits"}'
	exit 0
fi

# Check if prior commits are a subset of current commits
# Use order-preserving approach: check all prior commits exist in current
IS_SUBSET=$(jq -n \
	--argjson prior "$PRIOR_COMMITS" \
	--argjson current "$CURRENT_COMMITS" \
	'[$prior[] | . as $p | $current | index($p) != null] | all'
)

if [[ "$IS_SUBSET" != "true" ]]; then
	echo '{"mode":"FULL_REVIEW","reason":"prior commits not subset of current"}'
	exit 0
fi

# Find new commits (in current but not in prior) - order-preserving
NEW_COMMITS=$(jq -n -c \
	--argjson prior "$PRIOR_COMMITS" \
	--argjson current "$CURRENT_COMMITS" \
	'$current | map(select(. as $c | $prior | index($c) | not))'
)

# ═══════════════════════════════════════════════════════════════════════════════
# SUCCESS - DELTA REVIEW POSSIBLE
# ═══════════════════════════════════════════════════════════════════════════════

jq -n -c \
	--arg mode "DELTA_REVIEW" \
	--arg prior_verdict "$PRIOR_VERDICT" \
	--argjson prior_commits "$PRIOR_COMMITS" \
	--argjson new_commits "$NEW_COMMITS" \
	'{
		mode: $mode,
		prior_verdict: $prior_verdict,
		prior_commits: $prior_commits,
		new_commits: $new_commits
	}'
