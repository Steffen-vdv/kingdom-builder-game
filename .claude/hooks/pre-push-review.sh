#!/bin/bash
#
# PreToolUse hook for git push — Adversarial Review Gate
#
# This hook enforces mandatory code review before pushing.
#
# Security model (MCP-based QA approval):
#   - Main agents have ~/.claude-main-agent-marker (created by session-start.sh)
#   - Subagents do NOT have the marker file
#   - Only subagents (specifically the Pusher) can push
#   - Main agents are blocked and must use Pusher subagent
#
# Flow:
#   1. Main agent → QA subagent reviews → signs approval via MCP
#   2. Main agent → Pusher subagent → verifies signature → pushes
#
# Approval token format (JSON):
#   {
#     "status": "APPROVED",
#     "timestamp": "ISO8601",
#     "commits": ["sha1", "sha2"],
#     "reviewer_verdict": "summary of approval",
#     "signature": "HMAC-SHA256 signature"
#   }
#

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse command from tool input JSON
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only intercept git push commands
if [[ ! "$COMMAND" == *"git push"* ]]; then
	exit 0
fi

# Skip for --dry-run
if [[ "$COMMAND" == *"--dry-run"* ]]; then
	exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# ═══════════════════════════════════════════════════════════════════════════════
# BLOCK DIRECT PUSHES FROM MAIN AGENT
# ═══════════════════════════════════════════════════════════════════════════════
# Main agent has ~/.claude-main-agent-marker (created by session-start.sh)
# Subagents do NOT have this marker file
# Only the Pusher subagent should be pushing

MARKER_FILE="$HOME/.claude-main-agent-marker"

if [[ -f "$MARKER_FILE" ]]; then
	cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Main agents cannot push directly                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

WHAT HAPPENED:
You attempted to run git push directly. Main agents must use the push workflow.

WHAT TO DO:
1. If you haven't done QA review yet:
   → Spawn QA subagent: Task(subagent_type: "code-reviewer", ...)
   → Wait for ✅ APPROVED verdict

2. After QA approval:
   → Spawn Pusher subagent: Task(subagent_type: "pusher", prompt: "Push approved changes")

REFERENCE: See docs/push-workflow.md for the complete push workflow.
BLOCKED
	exit 2
fi

# ═══════════════════════════════════════════════════════════════════════════════
# SUBAGENT CONTEXT — Verify approval before allowing push
# ═══════════════════════════════════════════════════════════════════════════════
# Defense-in-depth: Even for subagents, verify the approval file here.
# This prevents prompt injection attacks where pusher is tricked into running
# git push directly instead of using the MCP verify_and_push tool.

APPROVAL_FILE="$HOME/.claude-push-approval"

# Check approval file exists
if [[ ! -f "$APPROVAL_FILE" ]]; then
	cat >&2 << 'NO_APPROVAL'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — No approval file found                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

QA review must be completed before pushing.

WHAT TO DO:
→ Complete QA review first (Step 2 in docs/push-workflow.md)
→ After QA returns ✅ APPROVED, spawn pusher subagent (Step 3)

See: docs/push-workflow.md#troubleshooting
NO_APPROVAL
	exit 2
fi

# Read approval file
APPROVAL_CONTENT=$(cat "$APPROVAL_FILE" 2>/dev/null)
if [[ -z "$APPROVAL_CONTENT" ]]; then
	cat >&2 << 'EMPTY_APPROVAL'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Approval file is empty                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The approval file exists but is empty or unreadable.

WHAT TO DO:
→ Re-run QA review (Step 2 in docs/push-workflow.md)
→ Ensure QA returns ✅ APPROVED before spawning pusher

See: docs/push-workflow.md#troubleshooting
EMPTY_APPROVAL
	exit 2
fi

# Extract signature and payload
SIGNATURE=$(echo "$APPROVAL_CONTENT" | jq -r '.signature // empty' 2>/dev/null)
if [[ -z "$SIGNATURE" ]]; then
	cat >&2 << 'NO_SIGNATURE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Approval has no signature                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The approval file has no cryptographic signature.

WHAT TO DO:
→ Re-run QA review (Step 2 in docs/push-workflow.md)
→ Ensure QA returns ✅ APPROVED before spawning pusher

See: docs/push-workflow.md#troubleshooting
NO_SIGNATURE
	exit 2
fi

# Extract payload (everything except signature) and compute expected HMAC
PAYLOAD=$(echo "$APPROVAL_CONTENT" | jq -c 'del(.signature)' 2>/dev/null)
EXPECTED_SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$QA_SIGNING_SECRET" 2>/dev/null | awk '{print $2}')

if [[ "$SIGNATURE" != "$EXPECTED_SIGNATURE" ]]; then
	cat >&2 << 'BAD_SIGNATURE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Invalid signature                                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The approval file's signature is invalid.

WHAT TO DO:
→ Re-run QA review (Step 2 in docs/push-workflow.md)
→ This typically indicates a configuration issue

See: docs/push-workflow.md#troubleshooting
BAD_SIGNATURE
	exit 2
fi

# Verify HEAD commit is in approved commits
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
APPROVED_COMMITS=$(echo "$APPROVAL_CONTENT" | jq -r '.commits[]?' 2>/dev/null)

if ! echo "$APPROVED_COMMITS" | grep -q "^${HEAD_SHA}$"; then
	cat >&2 << COMMIT_MISMATCH
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — HEAD not in approved commits                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Current HEAD: $HEAD_SHA
Approved commits: $(echo "$APPROVED_COMMITS" | tr '\n' ' ')

New commits were added after QA approval.

WHAT TO DO:
→ Re-run QA review for the current changes (Step 2 in docs/push-workflow.md)
→ QA must approve the new commits before pushing

See: docs/push-workflow.md#troubleshooting
COMMIT_MISMATCH
	exit 2
fi

# All verification passed — allow push
exit 0

# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY CODE BELOW (kept for reference, no longer executed)
# ═══════════════════════════════════════════════════════════════════════════════

# State files
APPROVAL_FILE="$HOME/.claude-push-approval"
REVIEW_STATE_FILE="$HOME/.claude-review-state"

# Get commits that would be pushed
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Find a valid upstream reference with fallback chain
find_upstream() {
	# 1. Try the configured upstream
	local upstream
	upstream=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null)
	if [[ -n "$upstream" ]] && git rev-parse "$upstream" &>/dev/null; then
		echo "$upstream"
		return 0
	fi

	# 2. Try origin/main, then origin/HEAD (default branch symref)
	for ref in "origin/main" "origin/HEAD"; do
		if git rev-parse "$ref" &>/dev/null; then
			echo "$ref"
			return 0
		fi
	done

	# 3. Local refs failed - try fetching origin/main from remote
	# This handles fresh clones or repos where main wasn't tracked locally
	if git fetch origin main --quiet 2>/dev/null; then
		if git rev-parse "origin/main" &>/dev/null; then
			echo "origin/main"
			return 0
		fi
	fi

	# 4. No valid upstream found - use empty tree (all commits are "new")
	# This ensures new branches without any remote refs still get reviewed
	echo "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
	return 0
}

UPSTREAM=$(find_upstream)

# Count unpushed commits
UNPUSHED_COUNT=$(git rev-list "$UPSTREAM..HEAD" --count 2>/dev/null || echo "0")

if [[ "$UNPUSHED_COUNT" == "0" ]]; then
	# Nothing to push, allow
	exit 0
fi

# Get list of unpushed commit SHAs
UNPUSHED_COMMITS=$(git rev-list "$UPSTREAM..HEAD" 2>/dev/null | tr '\n' ' ')

# Check if approval file exists and is valid
if [[ -f "$APPROVAL_FILE" ]]; then
	APPROVAL_STATUS=$(jq -r '.status // empty' "$APPROVAL_FILE" 2>/dev/null)
	APPROVAL_COMMITS=$(jq -r '.commits | join(" ")' "$APPROVAL_FILE" 2>/dev/null)

	if [[ "$APPROVAL_STATUS" == "APPROVED" ]]; then
		# Verify the approval covers these commits
		# (Simple check: at least the HEAD commit should match)
		HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
		if [[ "$APPROVAL_COMMITS" == *"$HEAD_SHA"* ]]; then
			# Valid approval, allow push and clean up
			rm -f "$APPROVAL_FILE"
			rm -f "$REVIEW_STATE_FILE"
			exit 0
		else
			# Approval exists but for different commits
			cat >&2 << 'STALE_APPROVAL'
⚠️ APPROVAL STALE — New commits detected

The existing approval was for different commits.
You must re-run QA review for the current changes.

STALE_APPROVAL
			rm -f "$APPROVAL_FILE"
			# Fall through to block
		fi
	fi
fi

# Track review round
REVIEW_ROUND=1
if [[ -f "$REVIEW_STATE_FILE" ]]; then
	REVIEW_ROUND=$(jq -r '.round // 1' "$REVIEW_STATE_FILE" 2>/dev/null)
	REVIEW_ROUND=$((REVIEW_ROUND + 1))
fi

# Save review state
echo "{\"round\": $REVIEW_ROUND, \"branch\": \"$CURRENT_BRANCH\", \"commits\": \"$UNPUSHED_COMMITS\"}" > "$REVIEW_STATE_FILE"

# Check if we've hit max iterations
if [[ $REVIEW_ROUND -gt 5 ]]; then
	# Reset the counter so next push attempt starts fresh after user guidance
	rm -f "$REVIEW_STATE_FILE"
	cat >&2 << 'MAX_ITERATIONS'
🚨 MANDATORY USER ESCALATION

5 review rounds completed without approval.

You MUST escalate to the user now:
1. Summarize the issues encountered in each round
2. Present remaining concerns
3. Ask user to: clarify behavior, override concerns, or redirect approach

DO NOT attempt another push until user has provided guidance.
(Review round counter has been reset for next attempt after user guidance.)
MAX_ITERATIONS
	exit 2
fi

# Get the diff summary for the review prompt
DIFF_STATS=$(git diff --stat "$UPSTREAM..HEAD" 2>/dev/null | tail -20)
CHANGED_FILES=$(git diff --name-only "$UPSTREAM..HEAD" 2>/dev/null | head -30)

# Block and instruct
cat >&2 << BLOCK_MESSAGE
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Adversarial Code Review Required                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Review Round: $REVIEW_ROUND of 5
Branch: $CURRENT_BRANCH
Unpushed commits: $UNPUSHED_COUNT

Changed files:
$CHANGED_FILES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED: Pass adversarial QA review before pushing.

Follow the procedure in: docs/push-workflow.md

Quick summary:
1. Prepare your claims (root cause, layer, tests, user approval, docs)
2. Spawn QA subagent with Task tool (subagent echoes request verbatim)
3. Relay complete QA response to user
4. Handle verdict: fix if BLOCKED, escalate if NEEDS INPUT
5. After ✅ APPROVED, write token to: $APPROVAL_FILE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLOCK_MESSAGE

exit 2
