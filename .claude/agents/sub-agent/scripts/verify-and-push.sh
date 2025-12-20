#!/bin/bash
#
# verify-and-push.sh — Cryptographically verified git push
#
# Usage:
#   verify-and-push.sh --from-disk [branch]     # Read review-lead.json (preferred)
#   verify-and-push.sh --override '<token>'     # Bypass QA with override token
#
# From-disk mode (recommended):
#   1. Reads review-lead.json from /tmp/claude/sub-agents/output/
#   2. Extracts payload and signature
#   3. Verifies signature via crypto-gate
#   4. Validates verdict, commits, and input hash
#   5. Executes git push if all checks pass
#   6. Cleans up QA outputs on success
#
# Override mode (escape hatch):
#   1. Calls crypto-gate to verify the override token
#   2. Executes git push if token is valid
#
# Security: Only agents with access to crypto-gate can produce valid signatures.
# The master-agent cannot sign, so it cannot push directly.
#

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# DETERMINE PROJECT ROOT
# ═══════════════════════════════════════════════════════════════════════════════

# Derive project root from script location (.claude/agents/sub-agent/scripts/verify-and-push.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/../../../.." && pwd)}"
SHARED_SCRIPTS="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts"

# QA paths - source from config for consistency
source "$CLAUDE_PROJECT_DIR/.claude/config/paths.sh"

# ═══════════════════════════════════════════════════════════════════════════════
# LOCATE CRYPTO-GATE BINARY
# ═══════════════════════════════════════════════════════════════════════════════

find_crypto_gate() {
	# The wrapper script handles platform detection
	local WRAPPER="$CLAUDE_PROJECT_DIR/bin/crypto-gate"

	if [[ -x "$WRAPPER" ]]; then
		echo "$WRAPPER"
		return 0
	fi

	cat >&2 << 'NO_BINARY'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ CRYPTO-GATE NOT FOUND                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The crypto-gate wrapper script is not found or not executable.

Expected: $CLAUDE_PROJECT_DIR/bin/crypto-gate

The crypto-gate binary should be downloaded by master-agent at session start.
If you are a subagent and see this, report the error to the master-agent.
NO_BINARY
	return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# CLEANUP FUNCTION
# ═══════════════════════════════════════════════════════════════════════════════

cleanup_qa_outputs() {
	# Archive prompt log before cleanup (for audit trail)
	if [[ -f "$QA_PROMPT_LOG_FILE" ]]; then
		local archive_dir="/tmp/claude/qa/archive"
		mkdir -p "$archive_dir"
		local timestamp
		timestamp=$(date -u +%Y%m%d-%H%M%S)
		mv "$QA_PROMPT_LOG_FILE" "$archive_dir/prompts-$timestamp.jsonl"

		# Keep only last 10 archived prompt logs
		ls -t "$archive_dir"/prompts-*.jsonl 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
	fi

	# Clean up QA output files for next workflow
	rm -f "$QA_OUTPUT_DIR"/*.json 2>/dev/null || true
	rm -f "$QA_CURRENT_DIR/input.json" 2>/dev/null || true
	rm -f "$QA_CURRENT_DIR/input.sha256" 2>/dev/null || true
	rm -rf "$QA_CURRENT_DIR/delta" 2>/dev/null || true
	rm -f "$QA_CURRENT_DIR/.lock" 2>/dev/null || true
	rm -f "$QA_CURRENT_DIR/override-token" 2>/dev/null || true
}

# ═══════════════════════════════════════════════════════════════════════════════
# FROM-DISK MODE (reads review-lead.json)
# ═══════════════════════════════════════════════════════════════════════════════

if [[ "${1:-}" == "--from-disk" ]]; then
	BRANCH="${2:-}"

	REVIEW_LEAD_FILE="$QA_OUTPUT_DIR/review-lead.json"

	if [[ ! -f "$REVIEW_LEAD_FILE" ]]; then
		cat >&2 << 'NO_REVIEW_LEAD'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Missing review-lead.json                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The review-lead output file was not found at:
  /tmp/claude/sub-agents/output/review-lead.json

WHAT TO DO:
→ Run the QA workflow (Phase 1 + Phase 2) first
→ Ensure review-lead completed successfully
NO_REVIEW_LEAD
		exit 1
	fi

	# Extract fields from review-lead.json
	PAYLOAD=$(jq -r '.payload // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	SIGNATURE=$(jq -r '.signature // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	SIG_TYPE=$(jq -r '.signature_type // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")
	VERDICT=$(jq -r '.verdict // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")

	if [[ -z "$PAYLOAD" || -z "$SIGNATURE" ]]; then
		cat >&2 << 'MISSING_SIG'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Missing signature fields in review-lead.json               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The review-lead output is missing payload or signature.

WHAT TO DO:
→ Re-run Phase 2 (review-lead) to generate a valid signed output
MISSING_SIG
		exit 1
	fi

	if [[ "$SIG_TYPE" != "QA_FINAL_SIGNATORY" ]]; then
		cat >&2 << WRONG_TYPE
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Wrong signature type                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Expected signature_type: QA_FINAL_SIGNATORY
Found: $SIG_TYPE

Only review-lead can produce QA_FINAL_SIGNATORY signatures.
WRONG_TYPE
		exit 1
	fi

	if [[ "$VERDICT" != "APPROVED" ]]; then
		cat >&2 << WRONG_VERDICT
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Verdict is not APPROVED                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Review-lead verdict: ${VERDICT:-<missing>}
Expected verdict: APPROVED

Only APPROVED verdicts can authorize a push.

WHAT TO DO:
→ Address the blocking issues identified by reviewers
→ Re-run the QA workflow
WRONG_VERDICT
		exit 1
	fi

	CRYPTO_GATE=$(find_crypto_gate) || exit 1

	echo "Verifying signature via crypto-gate..." >&2

	if ! "$CRYPTO_GATE" verify "$PAYLOAD" "$SIGNATURE" --type QA_FINAL_SIGNATORY; then
		cat >&2 << 'INVALID_SIG'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Invalid signature                                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The cryptographic signature verification failed.

WHAT TO DO:
→ Re-run QA review to get a fresh signature
INVALID_SIG
		exit 1
	fi

	echo "✓ Signature valid" >&2
	echo "✓ Verdict is APPROVED" >&2

	# Verify input hash matches canonical input
	CURRENT_INPUT_HASH=""
	if [[ -f "$QA_CURRENT_DIR/input.sha256" ]]; then
		CURRENT_INPUT_HASH=$(cat "$QA_CURRENT_DIR/input.sha256")
	fi

	PAYLOAD_INPUT_HASH=$(jq -r '.payload_json.input_hash // ""' "$REVIEW_LEAD_FILE" 2>/dev/null || echo "")

	if [[ -n "$CURRENT_INPUT_HASH" && -n "$PAYLOAD_INPUT_HASH" && "$PAYLOAD_INPUT_HASH" != "$CURRENT_INPUT_HASH" ]]; then
		cat >&2 << HASH_MISMATCH
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Input hash mismatch                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Signed input hash: $PAYLOAD_INPUT_HASH
Current input hash: $CURRENT_INPUT_HASH

The review was performed on different input than what exists now.

WHAT TO DO:
→ Re-run the QA workflow from Phase 1
HASH_MISMATCH
		exit 1
	fi

	echo "✓ Input hash verified" >&2

	# Verify HEAD commit is in approved commits
	HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)

	# Get commits from payload_json (the pre-parsed object)
	APPROVED_COMMITS=$(jq -r '.payload_json.input.commits[]?' "$REVIEW_LEAD_FILE" 2>/dev/null)

	if [[ -z "$APPROVED_COMMITS" ]]; then
		# Fallback: try to get from canonical input
		if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
			APPROVED_COMMITS=$(jq -r '.commits[]?' "$QA_CURRENT_DIR/input.json" 2>/dev/null)
		fi
	fi

	# Block if no commits could be loaded - cannot verify HEAD without commit list
	if [[ -z "$APPROVED_COMMITS" ]]; then
		cat >&2 << 'NO_COMMITS'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — No approved commits found                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Could not load approved commits from:
- review-lead.json (.payload_json.input.commits)
- input.json (.commits)

Cannot verify HEAD is approved without commit list.

WHAT TO DO:
→ Re-run QA workflow from Phase 1 to generate proper input
NO_COMMITS
		exit 1
	fi

	if ! echo "$APPROVED_COMMITS" | grep -q "^${HEAD_SHA}$"; then
		cat >&2 << COMMIT_MISMATCH
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — HEAD not in approved commits                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Current HEAD: $HEAD_SHA
Approved commits: $(echo "$APPROVED_COMMITS" | tr '\n' ' ')

New commits were added after QA approval.

WHAT TO DO:
→ Re-run QA review for the current commits
COMMIT_MISMATCH
		exit 1
	fi

	echo "✓ HEAD commit is approved" >&2

	# Determine branch
	if [[ -z "$BRANCH" ]]; then
		# Try to get from canonical input first
		if [[ -f "$QA_CURRENT_DIR/input.json" ]]; then
			BRANCH=$(jq -r '.branch // ""' "$QA_CURRENT_DIR/input.json" 2>/dev/null)
		fi
		# Fallback to current branch
		if [[ -z "$BRANCH" ]]; then
			BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
		fi
	fi

	echo "Pushing to origin/$BRANCH..." >&2

	if git push -u origin "$BRANCH"; then
		cat >&2 << SUCCESS
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ✅ PUSH SUCCESSFUL                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Branch: $BRANCH
Commit: $HEAD_SHA
SUCCESS
		cleanup_qa_outputs

		# Track last pushed SHA for stale data detection
		echo "$HEAD_SHA" > "$QA_CURRENT_DIR/last-pushed.sha"

		exit 0
	else
		cat >&2 << 'PUSH_FAILED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ GIT PUSH FAILED                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The signature was valid, but git push failed.

WHAT TO DO:
→ Check network connectivity
→ Verify you have push access to the remote
→ Retry the push
PUSH_FAILED
		exit 1
	fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# OVERRIDE MODE
# ═══════════════════════════════════════════════════════════════════════════════
# Token file format: {"head":"<sha>","branch":"<branch>","token":"<token>"}
# We verify both the token AND that HEAD matches what was authorized.

if [[ "${1:-}" == "--override" ]]; then
	TOKEN="${2:-}"
	BRANCH="${3:-}"

	if [[ -z "$TOKEN" ]]; then
		cat >&2 << 'USAGE_OVERRIDE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ USAGE ERROR — Missing override token                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Usage: verify-and-push.sh --override '<token>' [branch]

The override token must be provided by the user.
USAGE_OVERRIDE
		exit 1
	fi

	CRYPTO_GATE=$(find_crypto_gate) || exit 1

	echo "Verifying override token via crypto-gate..." >&2

	if ! "$CRYPTO_GATE" verify-override "$TOKEN"; then
		cat >&2 << 'INVALID_TOKEN'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Invalid override token                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The override token verification failed.

WHAT TO DO:
→ Verify you entered the correct override token
→ Contact the repository owner if you don't have the token
INVALID_TOKEN
		exit 1
	fi

	echo "✓ Override token valid" >&2

	# Verify HEAD matches stored HEAD (defense in depth - also checked in pre-task hook)
	HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
	OVERRIDE_FILE="$QA_CURRENT_DIR/override-token"

	if [[ -f "$OVERRIDE_FILE" ]]; then
		STORED_HEAD=$(jq -r '.head // ""' "$OVERRIDE_FILE" 2>/dev/null || echo "")
		if [[ -n "$STORED_HEAD" && "$STORED_HEAD" != "$HEAD_SHA" ]]; then
			cat >&2 << HEAD_MISMATCH
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Override HEAD mismatch                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Override was authorized for: $STORED_HEAD
Current HEAD:               $HEAD_SHA

New commits were added after the override was authorized.

WHAT TO DO:
→ Request a new override token for the current HEAD
→ Or revert to the authorized commit
HEAD_MISMATCH
			exit 1
		fi
		echo "✓ HEAD matches authorized commit" >&2
	fi

	# Determine branch
	if [[ -z "$BRANCH" ]]; then
		BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
	fi

	echo "Pushing to origin/$BRANCH (OVERRIDE)..." >&2

	if git push -u origin "$BRANCH"; then
		cat >&2 << SUCCESS_OVERRIDE
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ✅ OVERRIDE PUSH SUCCESSFUL                                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Branch: $BRANCH
Commit: $HEAD_SHA

Note: This push bypassed normal QA workflow via user override.
SUCCESS_OVERRIDE
		cleanup_qa_outputs

		# Track last pushed SHA for stale data detection
		echo "$HEAD_SHA" > "$QA_CURRENT_DIR/last-pushed.sha"

		exit 0
	else
		cat >&2 << 'PUSH_FAILED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ GIT PUSH FAILED                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The override token was valid, but git push failed.

WHAT TO DO:
→ Check network connectivity
→ Verify you have push access to the remote
→ Retry the push
PUSH_FAILED
		exit 1
	fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# NO RECOGNIZED MODE — Show usage error
# ═══════════════════════════════════════════════════════════════════════════════

cat >&2 << 'USAGE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ USAGE ERROR — Missing required mode                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Usage:
  verify-and-push.sh --from-disk [branch]     # Read review-lead.json (preferred)
  verify-and-push.sh --override '<token>'     # Bypass QA with override token

Examples:
  verify-and-push.sh --from-disk
  verify-and-push.sh --override 'user-secret-token'
USAGE
exit 1
