#!/bin/bash
# PostToolUse hook for Task - parses QA verdict footer and writes signed output
#
# Phase 1 reviewers: review-ci-tests-required + 5 specialist reviewers
# Phase 2 reviewer: review-lead (aggregates Phase 1)
#
# This hook:
#   1. Extracts response text from tool_response.content[].text
#   2. Parses the strict QA_VERDICT: footer from the final line
#   3. Loads canonical input and delta info
#   4. Builds and signs the payload
#   5. Writes the signed output JSON file
#
# Note: safe-deployment-gate removed from QA pipeline (script-only now)

source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/qa-hook-lib.sh"

INPUT=$(cat)

SUBAGENT=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')

# =============================================================================
# CHECK IF THIS IS A QA SUBAGENT
# =============================================================================

if ! qa_is_qa_agent "$SUBAGENT"; then
	# Not a tracked subagent, exit silently
	exit 0
fi

log_hook "$SUBAGENT" "Processing (post-task)"

# =============================================================================
# EXTRACT RESPONSE TEXT
# =============================================================================

# Join all content[].text elements with newlines
RESPONSE_TEXT=$(echo "$INPUT" | jq -r '
	.tool_response.content // [] |
	map(select(.type == "text") | .text) |
	join("\n")
' 2>/dev/null)

if [[ -z "$RESPONSE_TEXT" ]]; then
	log_hook "$SUBAGENT" "ERROR: No response text found"
	qa_write_error_output "$SUBAGENT" "no_response_text"
	exit 0
fi

# =============================================================================
# PARSE QA_VERDICT FOOTER
# =============================================================================

FOOTER_JSON=""
if ! FOOTER_JSON=$(qa_parse_footer_from_text "$RESPONSE_TEXT" 2>&1); then
	log_hook "$SUBAGENT" "ERROR: Footer parsing failed - $FOOTER_JSON"
	qa_write_error_output "$SUBAGENT" "invalid_footer"
	exit 0
fi

log_hook "$SUBAGENT" "Footer parsed: $(echo "$FOOTER_JSON" | jq -c '.verdict')"

# =============================================================================
# FOOTER HARDENING (size limits)
# =============================================================================
# Prevent accidental large payload signing by enforcing limits

MAX_FOOTER_SIZE=4096
MAX_SUMMARY_LENGTH=500
MAX_BLOCKERS_COUNT=20
MAX_QUESTIONS_COUNT=10

# Check total footer size
FOOTER_SIZE=${#FOOTER_JSON}
if [[ $FOOTER_SIZE -gt $MAX_FOOTER_SIZE ]]; then
	log_hook "$SUBAGENT" "ERROR: Footer too large ($FOOTER_SIZE > $MAX_FOOTER_SIZE bytes)"
	qa_write_error_output "$SUBAGENT" "footer_too_large"
	exit 0
fi

# Check summary length
SUMMARY_LENGTH=$(echo "$FOOTER_JSON" | jq -r '.summary // "" | length')
if [[ $SUMMARY_LENGTH -gt $MAX_SUMMARY_LENGTH ]]; then
	log_hook "$SUBAGENT" "ERROR: Summary too long ($SUMMARY_LENGTH > $MAX_SUMMARY_LENGTH chars)"
	qa_write_error_output "$SUBAGENT" "summary_too_long"
	exit 0
fi

# Check blockers count
BLOCKERS_COUNT=$(echo "$FOOTER_JSON" | jq -r '.blockers // [] | length')
if [[ $BLOCKERS_COUNT -gt $MAX_BLOCKERS_COUNT ]]; then
	log_hook "$SUBAGENT" "ERROR: Too many blockers ($BLOCKERS_COUNT > $MAX_BLOCKERS_COUNT)"
	qa_write_error_output "$SUBAGENT" "too_many_blockers"
	exit 0
fi

# Check questions count
QUESTIONS_COUNT=$(echo "$FOOTER_JSON" | jq -r '.questions // [] | length')
if [[ $QUESTIONS_COUNT -gt $MAX_QUESTIONS_COUNT ]]; then
	log_hook "$SUBAGENT" "ERROR: Too many questions ($QUESTIONS_COUNT > $MAX_QUESTIONS_COUNT)"
	qa_write_error_output "$SUBAGENT" "too_many_questions"
	exit 0
fi

# =============================================================================
# LOAD CANONICAL INPUT AND HASH
# =============================================================================

INPUT_JSON=""
INPUT_HASH=""

if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
	INPUT_JSON=$(cat "$QA_CURRENT_DIR/input.json")
else
	log_hook "$SUBAGENT" "ERROR: Missing input.json"
	qa_write_error_output "$SUBAGENT" "missing_input_json"
	exit 0
fi

if [[ -f "$QA_CURRENT_DIR/input.sha256" ]]; then
	INPUT_HASH=$(cat "$QA_CURRENT_DIR/input.sha256")
else
	log_hook "$SUBAGENT" "ERROR: Missing input.sha256"
	qa_write_error_output "$SUBAGENT" "missing_input_hash"
	exit 0
fi

# =============================================================================
# LOAD DELTA INFO
# =============================================================================

DELTA_JSON='{"mode":"FULL_REVIEW"}'
DELTA_FILE="$QA_DELTA_DIR/${SUBAGENT}.json"

if [[ -f "$DELTA_FILE" ]]; then
	DELTA_JSON=$(cat "$DELTA_FILE")
fi

# =============================================================================
# BUILD PAYLOAD
# =============================================================================

PAYLOAD=$(qa_build_payload "$INPUT_JSON" "$INPUT_HASH" "$SUBAGENT" "$FOOTER_JSON" "$DELTA_JSON")

if [[ -z "$PAYLOAD" ]]; then
	log_hook "$SUBAGENT" "ERROR: Failed to build payload"
	qa_write_error_output "$SUBAGENT" "payload_build_failed"
	exit 0
fi

# =============================================================================
# SIGN PAYLOAD
# =============================================================================

SIG_TYPE=$(qa_sig_type_for_subagent "$SUBAGENT")

if [[ -z "$SIG_TYPE" ]]; then
	log_hook "$SUBAGENT" "ERROR: Unknown signature type for $SUBAGENT"
	qa_write_error_output "$SUBAGENT" "unknown_sig_type"
	exit 0
fi

SIGNATURE=""
if ! SIGNATURE=$(qa_sign_payload "$PAYLOAD" "$SIG_TYPE" 2>&1); then
	log_hook "$SUBAGENT" "ERROR: Signing failed - $SIGNATURE"
	qa_write_error_output "$SUBAGENT" "signing_failed"
	exit 0
fi

# =============================================================================
# WRITE SIGNED OUTPUT
# =============================================================================

qa_write_signed_output "$SUBAGENT" "$FOOTER_JSON" "$PAYLOAD" "$SIGNATURE" "$SIG_TYPE" "$DELTA_JSON" "$INPUT_HASH"

log_hook "$SUBAGENT" "Output written: $QA_OUTPUT_DIR/${SUBAGENT}.json"

exit 0
