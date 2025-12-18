#!/bin/bash
#
# PreToolUse hook — Block dangerous git commands
#
# HARD BLOCK (no override):
#   - git push → must use verify-bulk-and-push.sh workflow
#
# CONDITIONAL BLOCK (when QA state exists):
#   - git commit --amend
#   - git rebase (any form)
#   - git reset (any form)
#   - git merge --squash
#   - git cherry-pick
#
#   These commands change commit SHAs and invalidate QA signatures.
#   Only blocked when /tmp/claude/sub-agents/output/*.json files exist
#   (indicates QA round in progress).
#
#   Override: I_ACCEPT_FULL_REANALYSIS=1 git commit --amend
#

SCRIPTS_DIR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts"
QA_OUTPUT_DIR="/tmp/claude/sub-agents/output"

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse command from tool input JSON
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Only intercept Bash commands
if [[ "$TOOL_NAME" != "Bash" ]] || [[ -z "$COMMAND" ]]; then
	exit 0
fi

# Quick check: if it doesn't contain "git", skip parsing
if [[ ! "$COMMAND" == *"git"* ]]; then
	exit 0
fi

# Security pre-check: catch "git push" in chained commands (e.g., "git status && git push")
# The parser only returns the first command, so we need string matching for chains
if [[ "$COMMAND" =~ git[[:space:]]+push($|[[:space:]]|[;&\|]) ]]; then
	# Verify it's not an allowed command
	if [[ ! "$COMMAND" == *"verify-bulk-and-push"* ]] && \
	   [[ ! "$COMMAND" == *"verify-and-push"* ]] && \
	   [[ ! "$COMMAND" == *"--dry-run"* ]]; then
		cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — git push requires QA workflow                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct git push is not allowed. You must use the verified push workflow.

WORKFLOW:
1. Phase 1: Run 6 reviewers in parallel
2. Phase 2: Run review-lead with 6 signatures → produces final signature
3. Phase 3: Run safe-deployment-gate with review-lead's signature to push

BLOCKED
		exit 2
	fi
fi

# Parse the command using the command package
PARSED=$(echo "$COMMAND" | PYTHONPATH="$SCRIPTS_DIR" python3 -m command 2>/dev/null)

# If parse failed, allow (fail open - trust the package)
if [[ -z "$PARSED" ]]; then
	exit 0
fi

# Extract parsed fields
EXECUTABLE=$(echo "$PARSED" | jq -r '.executable // empty')
SUBCOMMAND=$(echo "$PARSED" | jq -r '.subcommand // empty')

# Only process git commands
if [[ "$EXECUTABLE" != "git" ]]; then
	exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════════
# HARD BLOCK: git push (no override)
# ═══════════════════════════════════════════════════════════════════════════════

if [[ "$SUBCOMMAND" == "push" ]]; then
	# Allow verify-bulk-and-push.sh or verify-and-push.sh
	if [[ "$COMMAND" == *"verify-bulk-and-push"* ]] || \
	   [[ "$COMMAND" == *"verify-and-push"* ]]; then
		exit 0
	fi

	# Allow --dry-run for testing
	HAS_DRY_RUN=$(echo "$PARSED" | jq -r '.flags["dry-run"] // false')
	if [[ "$HAS_DRY_RUN" == "true" ]]; then
		exit 0
	fi

	# Block all other git push attempts
	cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — git push requires QA workflow                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Direct git push is not allowed. You must use the verified push workflow.

WORKFLOW:
1. Phase 1: Run 6 reviewers in parallel
2. Phase 2: Run review-lead with 6 signatures → produces final signature
3. Phase 3: Run safe-deployment-gate with review-lead's signature to push

BLOCKED
	exit 2
fi

# ═══════════════════════════════════════════════════════════════════════════════
# CONDITIONAL BLOCK: Delta-invalidating commands (when QA state exists)
# ═══════════════════════════════════════════════════════════════════════════════

# Check if this is a delta-invalidating command
INVALIDATES_DELTA=false
INVALIDATING_REASON=""

case "$SUBCOMMAND" in
	commit)
		HAS_AMEND=$(echo "$PARSED" | jq -r '.flags.amend // false')
		if [[ "$HAS_AMEND" == "true" ]]; then
			INVALIDATES_DELTA=true
			INVALIDATING_REASON="git commit --amend rewrites the last commit"
		fi
		;;
	rebase)
		INVALIDATES_DELTA=true
		INVALIDATING_REASON="git rebase rewrites commit history"
		;;
	reset)
		INVALIDATES_DELTA=true
		INVALIDATING_REASON="git reset moves HEAD and can discard commits"
		;;
	merge)
		HAS_SQUASH=$(echo "$PARSED" | jq -r '.flags.squash // false')
		if [[ "$HAS_SQUASH" == "true" ]]; then
			INVALIDATES_DELTA=true
			INVALIDATING_REASON="git merge --squash combines commits into one"
		fi
		;;
	cherry-pick)
		INVALIDATES_DELTA=true
		INVALIDATING_REASON="git cherry-pick creates new commits with different SHAs"
		;;
esac

# If not a delta-invalidating command, allow
if [[ "$INVALIDATES_DELTA" != "true" ]]; then
	exit 0
fi

# Check for override
if [[ "$COMMAND" == *"I_ACCEPT_FULL_REANALYSIS=1"* ]]; then
	exit 0
fi

# Check if QA state exists (any .json files in output directory)
if [[ ! -d "$QA_OUTPUT_DIR" ]] || [[ -z "$(ls -A "$QA_OUTPUT_DIR"/*.json 2>/dev/null)" ]]; then
	# No QA state, allow the command
	exit 0
fi

# QA state exists and command would invalidate it - BLOCK
cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Command would invalidate QA signatures                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

$INVALIDATING_REASON

WHY THIS IS BLOCKED:
  QA reviewers have already analyzed your commits and signed their verdicts.
  This command changes commit SHAs, which invalidates those signatures.
  You would lose the benefit of fast delta review and require full re-analysis.

ALTERNATIVE:
  Create a new commit instead: git commit -m "fix: ..."
  Delta review will quickly verify the new commit against prior approvals.

OVERRIDE:
  If you understand the tradeoff and want to proceed anyway:
  I_ACCEPT_FULL_REANALYSIS=1 $COMMAND

BLOCKED
exit 2
