#!/usr/bin/env bash
# SubagentStop hook - Extract verdict, sign output, and unregister subagent
#
# This hook handles two responsibilities:
# 1. For QA agents: Extract QA_VERDICT from transcript, sign, and write output
# 2. For all agents: Unregister from context manager
#
# PostToolUse hooks do not fire in Claude Code SDK (known bug), so we extract
# the subagent response from agent_transcript_path instead of tool_response.

# Read stdin FIRST before cd (stdin may not survive cd in some shells)
HOOK_INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/qa-hook-lib.sh"

# =============================================================================
# EXTRACT HOOK INPUT FIELDS
# =============================================================================

AGENT_ID=$(echo "$HOOK_INPUT" | jq -r '.agent_id // empty' 2>/dev/null)
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.agent_transcript_path // empty' 2>/dev/null)

# =============================================================================
# AGENT TYPE LOOKUP
# =============================================================================
# SDK doesn't pass agent_type to SubagentStop, only to SubagentStart.
# We stored the mapping in SubagentStart, now look it up.

AGENT_MAP_DIR="/tmp/claude/context-manager"
AGENT_MAP_FILE="$AGENT_MAP_DIR/agent-$AGENT_ID.type"

# Try to get agent_type from hook input first (in case SDK behavior changes)
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

# If not in hook input, look up from our mapping file
if [[ -z "$AGENT_TYPE" && -n "$AGENT_ID" && -f "$AGENT_MAP_FILE" ]]; then
	AGENT_TYPE=$(cat "$AGENT_MAP_FILE" 2>/dev/null || echo "")
	log_hook "SubagentStop" "Looked up agent_type from mapping: $AGENT_TYPE (agent_id=$AGENT_ID)"

	# Clean up the mapping file
	rm -f "$AGENT_MAP_FILE"
fi

if [[ -z "$AGENT_TYPE" ]]; then
	log_hook "SubagentStop" "WARNING: Could not determine agent_type (agent_id=$AGENT_ID)"
fi

log_session "subagent:$AGENT_TYPE" "SubagentStop"

# =============================================================================
# QA VERDICT EXTRACTION AND SIGNING
# =============================================================================
# Only process QA agents (Phase 1 reviewers and review-lead).
# safe-deployment-gate does not need signing - it just runs verify-and-push.sh.

if qa_is_qa_agent "$AGENT_TYPE"; then
	log_hook "$AGENT_TYPE" "Processing QA verdict from transcript"

	# -------------------------------------------------------------------------
	# EXTRACT RESPONSE FROM TRANSCRIPT
	# -------------------------------------------------------------------------

	if [[ -z "$TRANSCRIPT_PATH" ]]; then
		log_hook "$AGENT_TYPE" "ERROR: No transcript path provided"
		qa_write_error_output "$AGENT_TYPE" "no_transcript_path"
	elif [[ ! -f "$TRANSCRIPT_PATH" ]]; then
		log_hook "$AGENT_TYPE" "ERROR: Transcript file not found: $TRANSCRIPT_PATH"
		qa_write_error_output "$AGENT_TYPE" "transcript_not_found"
	else
		RESPONSE_TEXT=""
		if ! RESPONSE_TEXT=$(qa_extract_response_from_transcript "$TRANSCRIPT_PATH" 2>&1); then
			log_hook "$AGENT_TYPE" "ERROR: Failed to extract response - $RESPONSE_TEXT"
			qa_write_error_output "$AGENT_TYPE" "extract_failed"
		else
			log_hook "$AGENT_TYPE" "Extracted response (${#RESPONSE_TEXT} chars)"

			# -----------------------------------------------------------------
			# PARSE QA_VERDICT FOOTER
			# -----------------------------------------------------------------

			FOOTER_JSON=""
			if ! FOOTER_JSON=$(qa_parse_footer_from_text "$RESPONSE_TEXT" 2>&1); then
				log_hook "$AGENT_TYPE" "ERROR: Footer parsing failed - $FOOTER_JSON"
				qa_write_error_output "$AGENT_TYPE" "invalid_footer"
			else
				log_hook "$AGENT_TYPE" "Footer parsed: $(echo "$FOOTER_JSON" | jq -c '.verdict')"

				# -------------------------------------------------------------
				# FOOTER HARDENING (size limits)
				# -------------------------------------------------------------

				MAX_FOOTER_SIZE=8192
				MAX_SUMMARY_LENGTH=4096
				MAX_BLOCKERS_COUNT=20
				MAX_QUESTIONS_COUNT=10

				FOOTER_SIZE=${#FOOTER_JSON}
				FOOTER_VALID=true

				if [[ $FOOTER_SIZE -gt $MAX_FOOTER_SIZE ]]; then
					log_hook "$AGENT_TYPE" "ERROR: Footer too large ($FOOTER_SIZE > $MAX_FOOTER_SIZE bytes)"
					qa_write_error_output "$AGENT_TYPE" "footer_too_large"
					FOOTER_VALID=false
				fi

				if [[ "$FOOTER_VALID" == "true" ]]; then
					SUMMARY_LENGTH=$(echo "$FOOTER_JSON" | jq -r '.summary // "" | length')
					if [[ $SUMMARY_LENGTH -gt $MAX_SUMMARY_LENGTH ]]; then
						log_hook "$AGENT_TYPE" "ERROR: Summary too long ($SUMMARY_LENGTH > $MAX_SUMMARY_LENGTH chars)"
						qa_write_error_output "$AGENT_TYPE" "summary_too_long"
						FOOTER_VALID=false
					fi
				fi

				if [[ "$FOOTER_VALID" == "true" ]]; then
					BLOCKERS_COUNT=$(echo "$FOOTER_JSON" | jq -r '.blockers // [] | length')
					if [[ $BLOCKERS_COUNT -gt $MAX_BLOCKERS_COUNT ]]; then
						log_hook "$AGENT_TYPE" "ERROR: Too many blockers ($BLOCKERS_COUNT > $MAX_BLOCKERS_COUNT)"
						qa_write_error_output "$AGENT_TYPE" "too_many_blockers"
						FOOTER_VALID=false
					fi
				fi

				if [[ "$FOOTER_VALID" == "true" ]]; then
					QUESTIONS_COUNT=$(echo "$FOOTER_JSON" | jq -r '.questions // [] | length')
					if [[ $QUESTIONS_COUNT -gt $MAX_QUESTIONS_COUNT ]]; then
						log_hook "$AGENT_TYPE" "ERROR: Too many questions ($QUESTIONS_COUNT > $MAX_QUESTIONS_COUNT)"
						qa_write_error_output "$AGENT_TYPE" "too_many_questions"
						FOOTER_VALID=false
					fi
				fi

				# -------------------------------------------------------------
				# LOAD CANONICAL INPUT AND SIGN
				# -------------------------------------------------------------

				if [[ "$FOOTER_VALID" == "true" ]]; then
					INPUT_JSON=""
					INPUT_HASH=""

					if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
						INPUT_JSON=$(cat "$QA_CURRENT_DIR/input.json")
					else
						log_hook "$AGENT_TYPE" "ERROR: Missing input.json"
						qa_write_error_output "$AGENT_TYPE" "missing_input_json"
						FOOTER_VALID=false
					fi

					if [[ "$FOOTER_VALID" == "true" && -f "$QA_CURRENT_DIR/input.sha256" ]]; then
						INPUT_HASH=$(cat "$QA_CURRENT_DIR/input.sha256")
					elif [[ "$FOOTER_VALID" == "true" ]]; then
						log_hook "$AGENT_TYPE" "ERROR: Missing input.sha256"
						qa_write_error_output "$AGENT_TYPE" "missing_input_hash"
						FOOTER_VALID=false
					fi

					if [[ "$FOOTER_VALID" == "true" ]]; then
						# Load delta info
						DELTA_JSON='{"mode":"FULL_REVIEW"}'
						DELTA_FILE="$QA_DELTA_DIR/${AGENT_TYPE}.json"
						if [[ -f "$DELTA_FILE" ]]; then
							DELTA_JSON=$(cat "$DELTA_FILE")
						fi

						# Build payload
						PAYLOAD=$(qa_build_payload "$INPUT_JSON" "$INPUT_HASH" "$AGENT_TYPE" "$FOOTER_JSON" "$DELTA_JSON")

						if [[ -z "$PAYLOAD" ]]; then
							log_hook "$AGENT_TYPE" "ERROR: Failed to build payload"
							qa_write_error_output "$AGENT_TYPE" "payload_build_failed"
						else
							# Get signature type
							SIG_TYPE=$(qa_sig_type_for_subagent "$AGENT_TYPE")

							if [[ -z "$SIG_TYPE" ]]; then
								log_hook "$AGENT_TYPE" "ERROR: Unknown signature type for $AGENT_TYPE"
								qa_write_error_output "$AGENT_TYPE" "unknown_sig_type"
							else
								# Sign payload
								SIGNATURE=""
								if ! SIGNATURE=$(qa_sign_payload "$PAYLOAD" "$SIG_TYPE" 2>&1); then
									log_hook "$AGENT_TYPE" "ERROR: Signing failed - $SIGNATURE"
									qa_write_error_output "$AGENT_TYPE" "signing_failed"
								else
									# Write signed output
									qa_write_signed_output "$AGENT_TYPE" "$FOOTER_JSON" "$PAYLOAD" "$SIGNATURE" "$SIG_TYPE" "$DELTA_JSON" "$INPUT_HASH"
									log_hook "$AGENT_TYPE" "Output written: $QA_OUTPUT_DIR/${AGENT_TYPE}.json"
								fi
							fi
						fi
					fi
				fi
			fi
		fi
	fi
fi

# =============================================================================
# UNREGISTER SUBAGENT
# =============================================================================

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
"$CTX_MGR/unregister-subagent.sh" "$AGENT_TYPE"

log_session "subagent:$AGENT_TYPE" "SubagentStop" "completed"
