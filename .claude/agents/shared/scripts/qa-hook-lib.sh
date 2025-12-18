#!/bin/bash
#
# qa-hook-lib.sh — Shared library for QA workflow hooks
#
# This is the single source of truth for:
#   - QA agent type mapping and validation
#   - Canonical input/output path management
#   - Delta review computation
#   - Footer parsing and payload building
#   - Cryptographic operations
#
# Usage:
#   source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/qa-hook-lib.sh"
#
# All functions are prefixed with qa_ to avoid namespace collisions.
#

set -euo pipefail

# =============================================================================
# SIGNATURE TYPE MAPPING (hardcoded, never from model output)
# =============================================================================

declare -A QA_AGENT_SIG_TYPES=(
	["review-ci-tests-required"]="QA_CI_REQUIRED_TESTS"
	["review-claims-auditor"]="QA_CLAIMS_AUDITOR"
	["review-contracts-boundaries"]="QA_CONTRACTS_BOUNDARIES"
	["review-mechanics-content"]="QA_MECHANICS_CONTENT"
	["review-infra-concurrency"]="QA_INFRA_CONCURRENCY"
	["review-tests-docs-dry"]="QA_TESTS_DOCS_DRY"
	["review-lead"]="QA_FINAL_SIGNATORY"
)

# Phase 1 reviewers (all except review-lead)
QA_PHASE1_AGENTS="review-ci-tests-required|review-claims-auditor|review-contracts-boundaries|review-mechanics-content|review-infra-concurrency|review-tests-docs-dry"

# All QA agents (Phase 1 + review-lead)
QA_ALL_AGENTS="$QA_PHASE1_AGENTS|review-lead"

# =============================================================================
# SIGNATURE TYPE FUNCTIONS
# =============================================================================

# qa_sig_type_for_subagent(subagent_type) -> prints signature type or empty
qa_sig_type_for_subagent() {
	local agent="$1"
	echo "${QA_AGENT_SIG_TYPES[$agent]:-}"
}

# qa_is_phase1_reviewer(subagent_type) -> returns 0 if phase1, 1 otherwise
qa_is_phase1_reviewer() {
	local agent="$1"
	[[ "$agent" =~ ^($QA_PHASE1_AGENTS)$ ]]
}

# qa_is_review_lead(subagent_type) -> returns 0 if review-lead, 1 otherwise
qa_is_review_lead() {
	local agent="$1"
	[[ "$agent" == "review-lead" ]]
}

# qa_is_qa_agent(subagent_type) -> returns 0 if any QA agent, 1 otherwise
qa_is_qa_agent() {
	local agent="$1"
	[[ "$agent" =~ ^($QA_ALL_AGENTS)$ ]]
}

# =============================================================================
# PATH MANAGEMENT
# =============================================================================

QA_CURRENT_DIR="/tmp/claude/qa/current"
QA_DELTA_DIR="/tmp/claude/qa/current/delta"
QA_PROMPT_LOG_DIR="/tmp/claude/qa/prompt-log"
QA_OUTPUT_DIR="/tmp/claude/sub-agents/output"

# qa_paths_init() -> creates all required directories
qa_paths_init() {
	mkdir -p "$QA_CURRENT_DIR"
	mkdir -p "$QA_DELTA_DIR"
	mkdir -p "$QA_PROMPT_LOG_DIR"
	mkdir -p "$QA_OUTPUT_DIR"
}

# qa_crypto_gate_path() -> prints path to crypto-gate; exits 1 if not executable
qa_crypto_gate_path() {
	local path="${CLAUDE_PROJECT_DIR:-$(pwd)}/bin/crypto-gate"
	if [[ ! -x "$path" ]]; then
		echo "ERROR: crypto-gate not found or not executable at $path" >&2
		return 1
	fi
	echo "$path"
}

# qa_prompt_log_path(session_id) -> prints path to prompt log file
qa_prompt_log_path() {
	local session_id="$1"
	echo "$QA_PROMPT_LOG_DIR/${session_id}.jsonl"
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# qa_now_utc() -> prints ISO timestamp
qa_now_utc() {
	date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# qa_sha256_file(path) -> prints sha256 of file contents
qa_sha256_file() {
	local path="$1"
	sha256sum "$path" | cut -d' ' -f1
}

# qa_sha256_string(string) -> prints sha256 of string
qa_sha256_string() {
	local str="$1"
	echo -n "$str" | sha256sum | cut -d' ' -f1
}

# qa_canonicalize_json(json_string) -> outputs compact stable JSON (jq -cS .)
qa_canonicalize_json() {
	local json="$1"
	echo "$json" | jq -cS '.'
}

# =============================================================================
# PROMPT LOGGING
# =============================================================================

# qa_intent_from_prompt_log(session_id) -> outputs JSON:
#   { "intent_id": "<sha256>", "intent_text": "<joined text>" }
# Uses last 8 prompts by default; joins with "\n\n---\n\n".
# If missing log => intent_text empty and intent_id = sha256("").
qa_intent_from_prompt_log() {
	local session_id="$1"
	local log_path
	log_path=$(qa_prompt_log_path "$session_id")

	local intent_text=""
	local intent_id=""

	if [[ -f "$log_path" ]]; then
		# Get last 8 prompts, extract prompt field, join with separator
		intent_text=$(tail -n 8 "$log_path" 2>/dev/null | \
			jq -r '.prompt // ""' 2>/dev/null | \
			paste -sd $'\n' - | \
			awk 'NR>1{printf "\n\n---\n\n"}{printf "%s",$0}' || echo "")
	fi

	intent_id=$(qa_sha256_string "$intent_text")

	jq -n -c \
		--arg intent_id "$intent_id" \
		--arg intent_text "$intent_text" \
		'{intent_id: $intent_id, intent_text: $intent_text}'
}

# =============================================================================
# GIT HELPERS
# =============================================================================

# qa_branch_guess_from_prompt(prompt_json) -> best-effort read .branch else empty
qa_branch_guess_from_prompt() {
	local prompt_json="$1"
	echo "$prompt_json" | jq -r '.branch // ""' 2>/dev/null || echo ""
}

# qa_current_branch() -> best-effort current branch name
qa_current_branch() {
	local branch
	branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
	if [[ "$branch" == "HEAD" ]]; then
		# Detached HEAD
		echo ""
	else
		echo "$branch"
	fi
}

# qa_current_commits_json(branch_opt) -> output JSON array of SHAs
# Simple and robust: always returns at least HEAD
qa_current_commits_json() {
	local branch_opt="${1:-}"
	local head_sha
	head_sha=$(git rev-parse HEAD 2>/dev/null || echo "")

	if [[ -z "$head_sha" ]]; then
		echo '[]'
		return
	fi

	# Try to get commits from origin/main...HEAD if origin/main exists
	if git rev-parse --verify origin/main >/dev/null 2>&1; then
		local commits
		commits=$(git log --format='%H' origin/main...HEAD 2>/dev/null | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo "[]")
		if [[ "$commits" != "[]" ]]; then
			echo "$commits"
			return
		fi
	fi

	# Fallback: just HEAD
	jq -n -c --arg head "$head_sha" '[$head]'
}

# qa_files_changed_json() -> JSON array of changed files; best effort
qa_files_changed_json() {
	if git rev-parse --verify origin/main >/dev/null 2>&1; then
		git diff --name-only origin/main...HEAD 2>/dev/null | \
			jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo '[]'
	else
		echo '[]'
	fi
}

# =============================================================================
# CANONICAL INPUT WRITING
# =============================================================================

# qa_write_canonical_input(session_id, tool_input_prompt, subagent_type) -> writes:
#   /tmp/claude/qa/current/input.json and input.sha256
# input.json structure (canonicalized, NO timestamp to ensure stable hash):
#   {
#     "branch": "<branch>",
#     "head": "<HEAD_SHA>",
#     "commits": [...],
#     "files_changed": [...],
#     "intent_id": "...",
#     "session_id": "..."
#   }
#
# IMPORTANT: This is called by pre-task hook for EVERY QA agent.
# To ensure stable hashes across the workflow, we:
#   1. Do NOT include timestamp in the canonical input (causes hash instability)
#   2. Reuse existing input.json if HEAD matches (allows Phase 1 agents to share hash)
#   3. Use flock-based locking to prevent race conditions with parallel hooks
#   4. Use atomic writes (temp file → mv) for consistency
qa_write_canonical_input() {
	local session_id="$1"
	local tool_input_prompt="${2:-}"
	local subagent_type="$3"

	qa_paths_init

	local lock_file="$QA_CURRENT_DIR/.lock"
	local input_file="$QA_CURRENT_DIR/input.json"
	local hash_file="$QA_CURRENT_DIR/input.sha256"

	# Get current HEAD first - this is our stability anchor
	local head_sha
	head_sha=$(git rev-parse HEAD 2>/dev/null || echo "")

	# Use flock for concurrency safety (6 parallel Phase 1 hooks may race)
	(
		flock -x 200

		# Check if input.json already exists with same HEAD
		# If so, reuse it to maintain hash stability across Phase 1 agents
		if [[ -f "$input_file" && -f "$hash_file" ]]; then
			local existing_head
			existing_head=$(jq -r '.head // ""' "$input_file" 2>/dev/null || echo "")
			if [[ "$existing_head" == "$head_sha" && -n "$existing_head" ]]; then
				# Same HEAD, reuse existing canonical input
				exit 0
			fi
		fi

		# Determine branch: try prompt JSON first, then git
		local branch=""
		if [[ -n "$tool_input_prompt" ]] && echo "$tool_input_prompt" | jq -e '.' >/dev/null 2>&1; then
			branch=$(qa_branch_guess_from_prompt "$tool_input_prompt")
		fi
		if [[ -z "$branch" ]]; then
			branch=$(qa_current_branch)
		fi

		# Get commits
		local commits
		commits=$(qa_current_commits_json "$branch")

		# Get files changed
		local files_changed
		files_changed=$(qa_files_changed_json)

		# Get intent from prompt log (intent_text excluded from canonical to keep hash stable)
		local intent_json
		intent_json=$(qa_intent_from_prompt_log "$session_id")
		local intent_id
		intent_id=$(echo "$intent_json" | jq -r '.intent_id')

		# Build input JSON (NO timestamp - ensures hash stability)
		local input_json
		input_json=$(jq -n -c \
			--arg branch "$branch" \
			--arg head "$head_sha" \
			--argjson commits "$commits" \
			--argjson files_changed "$files_changed" \
			--arg intent_id "$intent_id" \
			--arg session_id "$session_id" \
			'{
				branch: $branch,
				head: $head,
				commits: $commits,
				files_changed: $files_changed,
				intent_id: $intent_id,
				session_id: $session_id
			}')

		# Canonicalize
		local canonical
		canonical=$(qa_canonicalize_json "$input_json")

		# Atomic write: temp file → mv
		local tmp_input="${input_file}.tmp.$$"
		local tmp_hash="${hash_file}.tmp.$$"

		echo "$canonical" > "$tmp_input"
		local input_hash
		input_hash=$(qa_sha256_string "$canonical")
		echo "$input_hash" > "$tmp_hash"

		mv "$tmp_input" "$input_file"
		mv "$tmp_hash" "$hash_file"

	) 200>"$lock_file"
}

# =============================================================================
# FOOTER PARSING
# =============================================================================

# qa_parse_footer_from_text(full_text) -> output parsed footer JSON
# Must:
#   - take final non-empty line only
#   - require prefix QA_VERDICT:
#   - parse JSON after prefix
#   - validate fields: verdict in APPROVED|BLOCKED|NEEDS_INPUT, summary is string
#   - blockers/questions are arrays (default [])
# Returns non-zero if invalid.
qa_parse_footer_from_text() {
	local full_text="$1"

	# Get final non-empty line (|| true prevents pipefail exit on whitespace-only input)
	local last_line
	last_line=$(echo "$full_text" | grep -v '^[[:space:]]*$' | tail -n 1 || true)

	# Handle whitespace-only or empty input
	if [[ -z "$last_line" ]]; then
		echo '{"error":"Response contains no non-empty lines"}' >&2
		return 1
	fi

	# Check for QA_VERDICT: prefix
	if [[ ! "$last_line" =~ ^QA_VERDICT: ]]; then
		echo '{"error":"Missing QA_VERDICT: prefix on final line"}' >&2
		return 1
	fi

	# Extract JSON after prefix
	local json_part="${last_line#QA_VERDICT:}"

	# Parse JSON
	if ! echo "$json_part" | jq -e '.' >/dev/null 2>&1; then
		echo '{"error":"Invalid JSON after QA_VERDICT: prefix"}' >&2
		return 1
	fi

	# Validate required fields
	local verdict
	verdict=$(echo "$json_part" | jq -r '.verdict // ""')
	if [[ ! "$verdict" =~ ^(APPROVED|BLOCKED|NEEDS_INPUT)$ ]]; then
		echo '{"error":"verdict must be APPROVED, BLOCKED, or NEEDS_INPUT"}' >&2
		return 1
	fi

	local summary
	summary=$(echo "$json_part" | jq -r '.summary // ""')
	if [[ -z "$summary" ]]; then
		echo '{"error":"summary is required"}' >&2
		return 1
	fi

	# NOTE: No truncation here. Size limits are enforced in post-task-tool.sh
	# to keep this function pure (parse only, don't modify data).

	# Extract blockers and questions (default to empty arrays)
	local blockers
	blockers=$(echo "$json_part" | jq -c '.blockers // []')
	local questions
	questions=$(echo "$json_part" | jq -c '.questions // []')

	# Output normalized footer JSON
	jq -n -c \
		--arg verdict "$verdict" \
		--arg summary "$summary" \
		--argjson blockers "$blockers" \
		--argjson questions "$questions" \
		'{verdict: $verdict, summary: $summary, blockers: $blockers, questions: $questions}'
}

# =============================================================================
# PAYLOAD BUILDING AND SIGNING
# =============================================================================

# qa_build_payload(input_json_object, input_hash, agent, footer_json_object, delta_json_object)
# -> prints compact JSON string:
#   {"input":<input>,"input_hash":"...","agent":"...","verdict":<footer>,"delta":<delta>,"timestamp":"..."}
qa_build_payload() {
	local input_json="$1"
	local input_hash="$2"
	local agent="$3"
	local footer_json="$4"
	local delta_json="$5"

	local timestamp
	timestamp=$(qa_now_utc)

	jq -n -c \
		--argjson input "$input_json" \
		--arg input_hash "$input_hash" \
		--arg agent "$agent" \
		--argjson verdict "$footer_json" \
		--argjson delta "$delta_json" \
		--arg timestamp "$timestamp" \
		'{
			input: $input,
			input_hash: $input_hash,
			agent: $agent,
			verdict: $verdict,
			delta: $delta,
			timestamp: $timestamp
		}'
}

# qa_verify_payload_signature(payload_str, signature, type) -> calls crypto-gate verify
# Returns 0 if valid, 1 if invalid
qa_verify_payload_signature() {
	local payload="$1"
	local signature="$2"
	local sig_type="$3"

	local crypto_gate
	crypto_gate=$(qa_crypto_gate_path) || return 1

	local result
	result=$("$crypto_gate" verify "$payload" "$signature" --type "$sig_type" 2>&1) || true

	if [[ "$result" == "valid" ]]; then
		return 0
	else
		return 1
	fi
}

# qa_sign_payload(payload_str, sig_type) -> prints hex signature
# Returns 1 on failure
qa_sign_payload() {
	local payload="$1"
	local sig_type="$2"

	local crypto_gate
	crypto_gate=$(qa_crypto_gate_path) || return 1

	local signature
	signature=$("$crypto_gate" sign "$payload" --type "$sig_type" 2>&1)

	if [[ ! "$signature" =~ ^[a-f0-9]{64}$ ]]; then
		echo "ERROR: Invalid signature from crypto-gate: $signature" >&2
		return 1
	fi

	echo "$signature"
}

# =============================================================================
# DELTA REVIEW COMPUTATION
# =============================================================================

# qa_compute_delta(agent, current_commits_json) -> writes delta file and returns mode
# Output: JSON written to /tmp/claude/qa/current/delta/<agent>.json
# Returns: echoes the mode (FULL_REVIEW or DELTA_REVIEW)
#
# Intent determinism: If intent_id changed between prior and current, we fall back to
# FULL_REVIEW because the user's intent might have changed.
qa_compute_delta() {
	local agent="$1"
	local current_commits="$2"

	qa_paths_init

	local delta_file="$QA_DELTA_DIR/${agent}.json"
	local prior_file="$QA_OUTPUT_DIR/${agent}.json"
	local input_file="$QA_CURRENT_DIR/input.json"

	# Default to full review
	local mode="FULL_REVIEW"
	local reason=""
	local prior_verdict=""
	local prior_commits='[]'
	local new_commits='[]'

	# Read current intent_id from canonical input
	local current_intent_id=""
	if [[ -f "$input_file" ]]; then
		current_intent_id=$(jq -r '.intent_id // ""' "$input_file" 2>/dev/null || echo "")
	fi

	if [[ ! -f "$prior_file" ]]; then
		reason="no prior state"
	else
		# Extract fields from prior JSON
		# Use payload (string) for signature verification, payload_json (object) for reading fields
		local prior_payload
		local prior_signature
		local prior_type

		prior_payload=$(jq -r '.payload // ""' "$prior_file" 2>/dev/null || echo "")
		prior_signature=$(jq -r '.signature // ""' "$prior_file" 2>/dev/null || echo "")
		prior_type=$(jq -r '.signature_type // ""' "$prior_file" 2>/dev/null || echo "")

		if [[ -z "$prior_payload" || -z "$prior_signature" || -z "$prior_type" ]]; then
			reason="prior state missing signature fields"
		else
			# Verify signature using the string payload
			if qa_verify_payload_signature "$prior_payload" "$prior_signature" "$prior_type"; then
				# Read fields from payload_json (the pre-parsed object)
				prior_commits=$(jq -c '.payload_json.input.commits // []' "$prior_file" 2>/dev/null || echo '[]')
				prior_verdict=$(jq -r '.payload_json.verdict.verdict // ""' "$prior_file" 2>/dev/null || echo "")

				# Check intent_id match (intent determinism)
				local prior_intent_id
				prior_intent_id=$(jq -r '.payload_json.input.intent_id // ""' "$prior_file" 2>/dev/null || echo "")

				if [[ -n "$current_intent_id" && -n "$prior_intent_id" && "$current_intent_id" != "$prior_intent_id" ]]; then
					reason="intent changed (intent_id mismatch)"
				elif [[ -z "$prior_commits" || "$prior_commits" == "[]" ]]; then
					reason="prior state has no commits"
				else
					# Check if prior commits are subset of current
					# Use order-preserving approach: check all prior commits exist in current
					local is_subset
					is_subset=$(jq -n \
						--argjson prior "$prior_commits" \
						--argjson current "$current_commits" \
						'[$prior[] | . as $p | $current | index($p) != null] | all')

					if [[ "$is_subset" == "true" ]]; then
						mode="DELTA_REVIEW"
						# Order-preserving: select from current those not in prior
						new_commits=$(jq -n -c \
							--argjson prior "$prior_commits" \
							--argjson current "$current_commits" \
							'$current | map(select(. as $c | $prior | index($c) | not))')
					else
						reason="prior commits not subset of current"
					fi
				fi
			else
				reason="signature verification failed"
			fi
		fi
	fi

	# Write delta file
	if [[ "$mode" == "DELTA_REVIEW" ]]; then
		jq -n -c \
			--arg mode "$mode" \
			--arg prior_verdict "$prior_verdict" \
			--argjson prior_commits "$prior_commits" \
			--argjson new_commits "$new_commits" \
			'{
				mode: $mode,
				prior_verdict: $prior_verdict,
				prior_commits: $prior_commits,
				new_commits: $new_commits
			}' > "$delta_file"
	else
		jq -n -c \
			--arg mode "$mode" \
			--arg reason "$reason" \
			'{mode: $mode, reason: $reason}' > "$delta_file"
	fi

	echo "$mode"
}

# =============================================================================
# PHASE 1 OUTPUT FILE VALIDATION
# =============================================================================

# qa_validate_phase1_outputs() -> validates all 6 phase1 output files
# Returns 0 if all valid, 1 if any invalid
# Outputs error message to stderr on failure
qa_validate_phase1_outputs() {
	local input_hash
	input_hash=$(cat "$QA_CURRENT_DIR/input.sha256" 2>/dev/null || echo "")

	if [[ -z "$input_hash" ]]; then
		echo "ERROR: Cannot read input hash from $QA_CURRENT_DIR/input.sha256" >&2
		return 1
	fi

	local agents=("review-ci-tests-required" "review-claims-auditor" "review-contracts-boundaries" "review-mechanics-content" "review-infra-concurrency" "review-tests-docs-dry")

	for agent in "${agents[@]}"; do
		local file="$QA_OUTPUT_DIR/${agent}.json"
		local expected_type="${QA_AGENT_SIG_TYPES[$agent]}"

		# Check file exists
		if [[ ! -f "$file" ]]; then
			echo "ERROR: Missing output file for $agent: $file" >&2
			return 1
		fi

		# Extract fields
		local payload signature sig_type verdict
		payload=$(jq -r '.payload // ""' "$file" 2>/dev/null || echo "")
		signature=$(jq -r '.signature // ""' "$file" 2>/dev/null || echo "")
		sig_type=$(jq -r '.signature_type // ""' "$file" 2>/dev/null || echo "")
		verdict=$(jq -r '.verdict // ""' "$file" 2>/dev/null || echo "")

		# Validate fields present
		if [[ -z "$payload" || -z "$signature" || -z "$sig_type" || -z "$verdict" ]]; then
			echo "ERROR: $agent output missing required fields" >&2
			return 1
		fi

		# Validate signature type matches expected
		if [[ "$sig_type" != "$expected_type" ]]; then
			echo "ERROR: $agent has wrong signature type: $sig_type (expected $expected_type)" >&2
			return 1
		fi

		# Verify signature using the string payload
		if ! qa_verify_payload_signature "$payload" "$signature" "$sig_type"; then
			echo "ERROR: $agent signature verification failed" >&2
			return 1
		fi

		# Verify input_hash matches (read from payload_json, the pre-parsed object)
		local payload_input_hash
		payload_input_hash=$(jq -r '.payload_json.input_hash // ""' "$file" 2>/dev/null || echo "")
		if [[ "$payload_input_hash" != "$input_hash" ]]; then
			echo "ERROR: $agent input_hash mismatch: $payload_input_hash != $input_hash" >&2
			return 1
		fi
	done

	return 0
}

# =============================================================================
# OUTPUT WRITING
# =============================================================================

# qa_write_error_output(agent, reason) -> writes ERROR output file (unsigned)
qa_write_error_output() {
	local agent="$1"
	local reason="$2"

	qa_paths_init

	local output_file="$QA_OUTPUT_DIR/${agent}.json"

	jq -n -c \
		--arg agent "$agent" \
		--arg reason "$reason" \
		'{
			agent: $agent,
			verdict: "ERROR",
			summary: "Missing/invalid QA_VERDICT footer",
			signature_type: null,
			payload: null,
			signature: null,
			blockers: null,
			questions: null,
			details: {reason: $reason}
		}' > "$output_file"
}

# qa_write_signed_output(agent, footer_json, payload, signature, sig_type, delta_json, input_hash)
# -> writes signed output file
#
# NOTE: We store BOTH payload (string for signature verification) AND payload_json (parsed object
# for reading fields like .input.commits). This solves the jq parsing issue where the payload
# string cannot be queried directly.
qa_write_signed_output() {
	local agent="$1"
	local footer_json="$2"
	local payload="$3"
	local signature="$4"
	local sig_type="$5"
	local delta_json="$6"
	local input_hash="$7"

	qa_paths_init

	local output_file="$QA_OUTPUT_DIR/${agent}.json"

	local verdict
	local summary
	local blockers
	local questions

	verdict=$(echo "$footer_json" | jq -r '.verdict')
	summary=$(echo "$footer_json" | jq -r '.summary')
	blockers=$(echo "$footer_json" | jq -c '.blockers')
	questions=$(echo "$footer_json" | jq -c '.questions')

	# Set blockers/questions to null if empty arrays and not needed
	if [[ "$verdict" != "BLOCKED" ]]; then
		blockers="null"
	fi
	if [[ "$verdict" != "NEEDS_INPUT" ]]; then
		questions="null"
	fi

	# Store both payload (string for crypto) and payload_json (object for reading)
	jq -n -c \
		--arg agent "$agent" \
		--arg verdict "$verdict" \
		--arg summary "$summary" \
		--arg sig_type "$sig_type" \
		--arg payload "$payload" \
		--argjson payload_json "$payload" \
		--arg signature "$signature" \
		--argjson blockers "$blockers" \
		--argjson questions "$questions" \
		--argjson delta "$delta_json" \
		--arg input_hash "$input_hash" \
		'{
			agent: $agent,
			verdict: $verdict,
			summary: $summary,
			signature_type: $sig_type,
			payload: $payload,
			payload_json: $payload_json,
			signature: $signature,
			blockers: $blockers,
			questions: $questions,
			details: {input_hash: $input_hash, delta: $delta}
		}' > "$output_file"
}
