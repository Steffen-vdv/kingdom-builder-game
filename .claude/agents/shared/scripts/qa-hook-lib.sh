#!/bin/bash
#
# qa-hook-lib.sh — Shared library for QA workflow hooks
#
# Provides:
#   - QA agent type validation (loaded from config/qa-agents.json)
#   - Canonical input/output path management (from config/paths.sh)
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
# COMPUTE CLAUDE_PROJECT_DIR IF NOT SET
# =============================================================================
# qa-hook-lib.sh is at .claude/agents/shared/scripts/qa-hook-lib.sh
# Project root is 4 levels up: ../../../..
# This must happen BEFORE sourcing paths.sh to ensure reliable path resolution.

if [[ -z "${CLAUDE_PROJECT_DIR:-}" ]]; then
	_QA_HOOK_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
	CLAUDE_PROJECT_DIR="$(cd "$_QA_HOOK_LIB_DIR/../../../.." && pwd)"
	export CLAUDE_PROJECT_DIR
fi

# =============================================================================
# LOAD CONSOLIDATED CONFIGS
# =============================================================================

# Source paths config (defines QA_CURRENT_DIR, QA_OUTPUT_DIR, etc.)
source "$CLAUDE_PROJECT_DIR/.claude/config/paths.sh"

# Load agent config from JSON
_QA_CONFIG="$CLAUDE_PROJECT_DIR/.claude/config/qa-agents.json"

# Build signature type mapping from JSON config
declare -A QA_AGENT_SIG_TYPES
while IFS='=' read -r agent sig_type; do
	QA_AGENT_SIG_TYPES["$agent"]="$sig_type"
done < <(jq -r '.signature_types | to_entries[] | "\(.key)=\(.value)"' "$_QA_CONFIG" 2>/dev/null)

# Build phase1 agents list (pipe-separated for regex matching)
QA_PHASE1_AGENTS=$(jq -r '.phase1_reviewers | join("|")' "$_QA_CONFIG" 2>/dev/null)

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

# qa_phase1_agents_array() -> outputs array of phase1 agent names
qa_phase1_agents_array() {
	jq -r '.phase1_reviewers[]' "$_QA_CONFIG" 2>/dev/null
}

# =============================================================================
# PATH MANAGEMENT (paths loaded from config/paths.sh)
# =============================================================================

# qa_paths_init() -> creates all required directories
qa_paths_init() {
	qa_init_dirs  # Defined in paths.sh
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

# qa_extract_response_from_transcript(transcript_path) -> prints response text
# Reads a Claude Agent SDK transcript file (JSONL format) and extracts
# all text content from the final assistant message.
#
# The transcript is newline-delimited JSON where each line is a message.
# We find the last assistant message with text content and join all text blocks.
qa_extract_response_from_transcript() {
	local transcript_path="$1"

	if [[ ! -f "$transcript_path" ]]; then
		echo "ERROR: Transcript file not found: $transcript_path" >&2
		return 1
	fi

	# Get the last line of the JSONL file (final message in conversation)
	# Extract all text content from .message.content[] where type=="text"
	local text
	text=$(tail -1 "$transcript_path" | jq -r '
		.message.content // []
		| map(select(.type == "text") | .text)
		| join("\n")
	' 2>/dev/null)

	if [[ -z "$text" ]]; then
		echo "ERROR: No text content found in final message" >&2
		return 1
	fi

	echo "$text"
}

# =============================================================================
# PROMPT LOGGING
# =============================================================================

# qa_prompts_from_log() -> outputs JSON array of user prompts
# Returns the last 100 prompts from the session log as a JSON array of strings.
# Each session gets fresh /tmp, so we use a fixed file path.
# If missing log => empty array [].
#
# NOTE: Each line in the JSONL file is one prompt entry. We use jq -s (slurp)
# to read all JSONL lines as an array, then extract the .prompt field from each.
# This correctly handles multi-line prompts without splitting them.
qa_prompts_from_log() {
	if [[ -f "$QA_PROMPT_LOG_FILE" ]]; then
		# Get last 100 JSONL entries, slurp into array, extract prompt fields
		tail -n 100 "$QA_PROMPT_LOG_FILE" 2>/dev/null | \
			jq -s '[.[].prompt | select(. != null and . != "")]' 2>/dev/null || echo '[]'
	else
		echo '[]'
	fi
}

# =============================================================================
# GIT HELPERS
# =============================================================================

# qa_is_already_pushed() -> returns 0 if HEAD matches last-pushed.sha, 1 otherwise
# Used by Phase 1 reviewers to detect if they're reviewing already-pushed commits.
qa_is_already_pushed() {
	local last_pushed_file="$QA_CURRENT_DIR/last-pushed.sha"
	if [[ ! -f "$last_pushed_file" ]]; then
		return 1  # No record of last push, so not already pushed
	fi

	local last_pushed_sha
	last_pushed_sha=$(cat "$last_pushed_file" 2>/dev/null || echo "")
	if [[ -z "$last_pushed_sha" ]]; then
		return 1
	fi

	local head_sha
	head_sha=$(git rev-parse HEAD 2>/dev/null || echo "")
	if [[ -z "$head_sha" ]]; then
		return 1
	fi

	[[ "$head_sha" == "$last_pushed_sha" ]]
}

# qa_branch_guess_from_prompt(prompt_json) -> best-effort read .branch else empty
qa_branch_guess_from_prompt() {
	local prompt_json="$1"
	echo "$prompt_json" | jq -r '.branch // ""' 2>/dev/null || echo ""
}

# qa_current_branch() -> best-effort current branch name
# Handles detached HEAD state common in CI environments
qa_current_branch() {
	local branch
	branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
	if [[ "$branch" != "HEAD" ]]; then
		echo "$branch"
		return
	fi

	# Detached HEAD - try CI environment variables
	# GitHub Actions: GITHUB_HEAD_REF (PRs) or GITHUB_REF_NAME (push)
	if [[ -n "${GITHUB_HEAD_REF:-}" ]]; then
		echo "$GITHUB_HEAD_REF"
		return
	fi
	if [[ -n "${GITHUB_REF_NAME:-}" ]]; then
		echo "$GITHUB_REF_NAME"
		return
	fi

	# Fallback: use short SHA as identifier
	local short_sha
	short_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
	echo "detached-$short_sha"
}

# qa_get_comparison_base(branch) -> output the best base ref for comparison
# Priority:
#   1. origin/$branch (if exists) - only unpushed commits
#   2. origin/main (fallback) - full branch scope
# This ensures reviewers only see unpushed work when possible.
qa_get_comparison_base() {
	local branch="${1:-}"

	# If branch provided, check for remote tracking branch first
	if [[ -n "$branch" ]]; then
		if git rev-parse --verify "origin/$branch" >/dev/null 2>&1; then
			echo "origin/$branch"
			return
		fi
	fi

	# Fallback to origin/main
	if git rev-parse --verify origin/main >/dev/null 2>&1; then
		echo "origin/main"
		return
	fi

	# No valid base found
	echo ""
}

# qa_current_commits_json(branch_opt) -> output JSON array of SHAs
# Simple and robust: always returns at least HEAD or empty array
# Limited to 100 commits to avoid shell ARG_MAX issues
# Uses remote tracking branch (origin/$branch) if available for correct scope.
qa_current_commits_json() {
	local branch_opt="${1:-}"
	local head_sha
	head_sha=$(git rev-parse HEAD 2>/dev/null || echo "")

	if [[ -z "$head_sha" ]]; then
		echo '[]'
		return
	fi

	# Get the best comparison base (prefers origin/$branch over origin/main)
	local base
	base=$(qa_get_comparison_base "$branch_opt")

	# Try to get commits from base...HEAD if base exists
	# Limit to 100 commits to avoid ARG_MAX issues in shell
	if [[ -n "$base" ]]; then
		local commits
		commits=$(git log --format='%H' -n 100 "${base}...HEAD" 2>/dev/null | jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null || echo "[]")
		# Return whatever we got (even empty array - means nothing unpushed)
		if [[ -n "$commits" ]]; then
			echo "$commits"
			return
		fi
	fi

	# Fallback only when no valid base exists (new repo, offline, etc.)
	# Use HEAD as single-element array
	local result
	result=$(jq -n -c --arg head "$head_sha" '[$head]' 2>/dev/null) || result=""
	if [[ -n "$result" ]]; then
		echo "$result"
	else
		# Manual JSON construction as ultimate fallback
		printf '["%s"]' "$head_sha"
	fi
}

# qa_files_changed_json(branch_opt) -> JSON array of changed files
# Uses remote tracking branch (origin/$branch) if available, else origin/main.
# Limited to 500 files to avoid shell ARG_MAX issues
# Always returns valid JSON array (empty [] if unable to determine)
qa_files_changed_json() {
	local branch_opt="${1:-}"

	# Get the best comparison base (prefers origin/$branch over origin/main)
	local base
	base=$(qa_get_comparison_base "$branch_opt")

	# If no base found, try to fetch origin/main
	if [[ -z "$base" ]]; then
		# Fetch main branch from origin (silent, don't fail if network issues)
		# Use timeout to prevent hanging in CI shallow clones
		timeout 5 git fetch --depth=1 origin main >/dev/null 2>&1 || true
		base=$(qa_get_comparison_base "$branch_opt")
	fi

	# Now try to get the diff (limit to 500 files to avoid ARG_MAX)
	if [[ -n "$base" ]]; then
		local result
		result=$(git diff --name-only "${base}...HEAD" 2>/dev/null | head -n 500 | \
			jq -R -s 'split("\n") | map(select(length > 0))' 2>/dev/null) || result=""
		if [[ -n "$result" ]]; then
			echo "$result"
		else
			echo '[]'
		fi
	else
		# Fallback: no valid base found (truly offline/shallow scenario)
		echo '[]'
	fi
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
# Uses temp files to avoid ARG_MAX limits with large input_json
qa_build_payload() {
	local input_json="$1"
	local input_hash="$2"
	local agent="$3"
	local footer_json="$4"
	local delta_json="$5"

	local timestamp
	timestamp=$(qa_now_utc)

	# Write JSON objects to temp files to avoid ARG_MAX
	local tmp_input="/tmp/qa-payload-input.$$.json"
	local tmp_verdict="/tmp/qa-payload-verdict.$$.json"
	local tmp_delta="/tmp/qa-payload-delta.$$.json"

	printf '%s' "$input_json" > "$tmp_input"
	printf '%s' "$footer_json" > "$tmp_verdict"
	printf '%s' "$delta_json" > "$tmp_delta"

	local result
	result=$(jq -n -c \
		--slurpfile input "$tmp_input" \
		--arg input_hash "$input_hash" \
		--arg agent "$agent" \
		--slurpfile verdict "$tmp_verdict" \
		--slurpfile delta "$tmp_delta" \
		--arg timestamp "$timestamp" \
		'{
			input: $input[0],
			input_hash: $input_hash,
			agent: $agent,
			verdict: $verdict[0],
			delta: $delta[0],
			timestamp: $timestamp
		}')

	rm -f "$tmp_input" "$tmp_verdict" "$tmp_delta"
	echo "$result"
}

# qa_verify_payload_signature(payload_str, signature, type) -> calls crypto-gate verify
# Returns 0 if valid, 1 if invalid
# Uses stdin ("-") to pass payload to avoid ARG_MAX limits
qa_verify_payload_signature() {
	local payload="$1"
	local signature="$2"
	local sig_type="$3"

	local crypto_gate
	crypto_gate=$(qa_crypto_gate_path) || return 1

	local result
	# Pass payload via stdin to avoid ARG_MAX limits
	result=$(echo -n "$payload" | "$crypto_gate" verify - "$signature" --type "$sig_type" 2>&1) || true

	if [[ "$result" == "valid" ]]; then
		return 0
	else
		return 1
	fi
}

# qa_sign_payload(payload_str, sig_type) -> prints hex signature
# Returns 1 on failure
# Uses stdin ("-") to pass payload to avoid ARG_MAX limits
qa_sign_payload() {
	local payload="$1"
	local sig_type="$2"

	local crypto_gate
	crypto_gate=$(qa_crypto_gate_path) || return 1

	local signature
	# Pass payload via stdin to avoid ARG_MAX limits
	signature=$(echo -n "$payload" | "$crypto_gate" sign - --type "$sig_type" 2>&1)

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
# Delta is purely commit-based: if prior commits are a subset of current commits,
# we do DELTA_REVIEW on only the new commits. User prompts are context, not cache keys.
#
# For DELTA_REVIEW, the delta file includes:
#   - prior_verdict: what the reviewer decided before
#   - prior_commits: commits already reviewed
#   - new_commits: only these need analysis
#   - prior_blockers: issues that caused BLOCKED verdict (if any)
#   - prior_questions: questions that caused NEEDS_INPUT verdict (if any)
#
# Reviewers should verify that new commits resolve any prior blockers/questions.
qa_compute_delta() {
	local agent="$1"
	local current_commits="$2"

	qa_paths_init

	local delta_file="$QA_DELTA_DIR/${agent}.json"
	local prior_file="$QA_OUTPUT_DIR/${agent}.json"

	# Default to full review
	local mode="FULL_REVIEW"
	local reason=""
	local prior_verdict=""
	local prior_commits='[]'
	local new_commits='[]'
	local prior_blockers='[]'
	local prior_questions='[]'

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

				# Extract prior blockers and questions for delta review
				# These help reviewers verify that new commits resolve prior issues
				prior_blockers=$(jq -c '.payload_json.verdict.blockers // []' "$prior_file" 2>/dev/null || echo '[]')
				prior_questions=$(jq -c '.payload_json.verdict.questions // []' "$prior_file" 2>/dev/null || echo '[]')

				if [[ -z "$prior_commits" || "$prior_commits" == "[]" ]]; then
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
			--argjson prior_blockers "$prior_blockers" \
			--argjson prior_questions "$prior_questions" \
			'{
				mode: $mode,
				prior_verdict: $prior_verdict,
				prior_commits: $prior_commits,
				new_commits: $new_commits,
				prior_blockers: $prior_blockers,
				prior_questions: $prior_questions
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
	# Use temp files for large JSON objects to avoid ARG_MAX limits
	local tmp_payload="/tmp/qa-output-payload.$$.json"
	local tmp_delta="/tmp/qa-output-delta.$$.json"

	printf '%s' "$payload" > "$tmp_payload"
	printf '%s' "$delta_json" > "$tmp_delta"

	jq -n -c \
		--arg agent "$agent" \
		--arg verdict "$verdict" \
		--arg summary "$summary" \
		--arg sig_type "$sig_type" \
		--rawfile payload "$tmp_payload" \
		--slurpfile payload_json "$tmp_payload" \
		--arg signature "$signature" \
		--argjson blockers "$blockers" \
		--argjson questions "$questions" \
		--slurpfile delta "$tmp_delta" \
		--arg input_hash "$input_hash" \
		'{
			agent: $agent,
			verdict: $verdict,
			summary: $summary,
			signature_type: $sig_type,
			payload: $payload,
			payload_json: $payload_json[0],
			signature: $signature,
			blockers: $blockers,
			questions: $questions,
			details: {input_hash: $input_hash, delta: $delta[0]}
		}' > "$output_file"

	rm -f "$tmp_payload" "$tmp_delta"
}
