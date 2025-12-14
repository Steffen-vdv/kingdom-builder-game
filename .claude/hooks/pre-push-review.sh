#!/bin/bash
#
# PreToolUse hook for git push — Adversarial Review Gate
#
# This hook enforces mandatory code review before pushing.
# The task agent MUST invoke the code-reviewer skill and obtain
# explicit APPROVED status before a push can proceed.
#
# State machine:
#   No approval file     → Block + instruct to invoke code-reviewer skill
#   Approval file exists → Check if valid approval → Allow or Block
#
# Approval token format (JSON):
#   {
#     "status": "APPROVED",
#     "timestamp": "ISO8601",
#     "commits": ["sha1", "sha2"],
#     "reviewer_verdict": "summary of approval"
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

# State files
APPROVAL_FILE="$HOME/.claude-push-approval"
REVIEW_STATE_FILE="$HOME/.claude-review-state"

# Get commits that would be pushed
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
UPSTREAM=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null || echo "origin/main")

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
You must re-run the code-reviewer skill for the current changes.

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
	cat >&2 << 'MAX_ITERATIONS'
🚨 MANDATORY USER ESCALATION

5 review rounds completed without approval.

You MUST escalate to the user now:
1. Summarize the issues encountered in each round
2. Present remaining concerns
3. Ask user to: clarify behavior, override concerns, or redirect approach

DO NOT attempt another push until user has provided guidance.
MAX_ITERATIONS
	exit 2
fi

# Get the diff summary for the review prompt
DIFF_STATS=$(git diff --stat "$UPSTREAM..HEAD" 2>/dev/null | tail -20)
CHANGED_FILES=$(git diff --name-only "$UPSTREAM..HEAD" 2>/dev/null | head -30)

# Block and instruct
cat >&2 << BLOCK_MESSAGE
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 PUSH BLOCKED — Adversarial Code Review Required (Subagent)                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Review Round: $REVIEW_ROUND of 5
Branch: $CURRENT_BRANCH
Unpushed commits: $UNPUSHED_COUNT

Changed files:
$CHANGED_FILES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIRED: Spawn a code-reviewer SUBAGENT using the Task tool.

The subagent provides TRUE CONTEXT SEPARATION — a fresh perspective without
your task-completion biases. This is mandatory for pre-push review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: Spawn the QA subagent with this Task tool call:

  Task tool parameters:
    description: "Adversarial code review"
    subagent_type: "general-purpose"
    prompt: <see below>

  Prompt for subagent (include your justification):
  ─────────────────────────────────────────────────────────────────────────────
  You are a QA AGENT reviewing code changes before push. Your role is
  ADVERSARIAL — you get promoted by BLOCKING bad changes. Assume every
  change is bad until proven otherwise.

  Read the code-reviewer skill at: .claude/skills/code-reviewer/SKILL.md
  Read CLAUDE.md for project rules.
  Review commits: git diff $UPSTREAM..HEAD

  The TASK AGENT claims:
  - Root cause: [FILL IN your root cause analysis]
  - Layer: [FILL IN which layer and why]
  - Tests: [FILL IN test coverage details]
  - User approval: [FILL IN what user approved, or "N/A"]
  - Documentation: [FILL IN if applicable]

  Review these claims skeptically. Verify by reading the actual code.
  Output EXACTLY ONE of:
    🚫 BLOCKED — with violation and required fix
    ⚠️ NEEDS USER INPUT — with specific question
    ✅ APPROVED — with verification summary
  ─────────────────────────────────────────────────────────────────────────────

STEP 2: Based on subagent response:

  If 🚫 BLOCKED:
    - Fix the violation
    - Commit the fix
    - Retry push (triggers next review round)

  If ⚠️ NEEDS USER INPUT:
    - Escalate to user with the specific question
    - Wait for user response
    - Adjust implementation
    - Retry push

  If ✅ APPROVED:
    - Write the approval token (see Step 3)
    - Retry push

STEP 3: Write approval token (only after ✅ APPROVED):

  Write this JSON to: $APPROVAL_FILE
  {
    "status": "APPROVED",
    "timestamp": "$(date -Iseconds)",
    "commits": [$(git rev-list "$UPSTREAM..HEAD" | sed 's/.*/"&"/' | tr '\n' ',' | sed 's/,$//')],
    "reviewer_verdict": "<paste subagent's approval summary>"
  }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REMEMBER:
• Provide clear justification for your implementation decisions
• The QA subagent will verify your claims by reading the actual code
• You may NOT lie about user approval
• After 5 rounds without approval → mandatory user escalation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTIONAL: For quick self-checks during development (not mandatory):
  skill: "code-reviewer"

This loads QA instructions into your own context. Useful for catching issues
early, but does NOT satisfy the mandatory pre-push subagent review.

BLOCK_MESSAGE

exit 2
