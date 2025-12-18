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

# ═══════════════════════════════════════════════════════════════════════════════
# Helper function: Check if a single command is a blocked git push
# Uses the Python parser which properly handles global flags like -C
# ═══════════════════════════════════════════════════════════════════════════════
check_git_push() {
	local cmd="$1"
	local parsed
	local executable
	local subcommand

	parsed=$(echo "$cmd" | PYTHONPATH="$SCRIPTS_DIR" python3 -m command 2>/dev/null)
	if [[ -z "$parsed" ]]; then
		return 1  # Parse failed, not a blocked push
	fi

	executable=$(echo "$parsed" | jq -r '.executable // empty')
	subcommand=$(echo "$parsed" | jq -r '.subcommand // empty')

	if [[ "$executable" == "git" ]] && [[ "$subcommand" == "push" ]]; then
		# Check for allowed contexts
		if [[ "$cmd" == *"verify-bulk-and-push"* ]] || \
		   [[ "$cmd" == *"verify-and-push"* ]]; then
			return 1  # Allowed
		fi

		# Check for --dry-run
		local has_dry_run
		has_dry_run=$(echo "$parsed" | jq -r '.flags["dry-run"] // false')
		if [[ "$has_dry_run" == "true" ]]; then
			return 1  # Allowed
		fi

		return 0  # Blocked push detected
	fi

	return 1  # Not a blocked push
}

# ═══════════════════════════════════════════════════════════════════════════════
# Check for git push in chained commands (e.g., "git status && git push")
# Split by shell operators and check each segment with the parser
# ═══════════════════════════════════════════════════════════════════════════════
if [[ "$COMMAND" == *"&&"* ]] || [[ "$COMMAND" == *"||"* ]] || \
   [[ "$COMMAND" == *";"* ]] || [[ "$COMMAND" == *"|"* ]]; then
	# Split command by shell operators and check each segment
	# Use Python for reliable splitting (handles quoted strings)
	while IFS= read -r segment; do
		segment=$(echo "$segment" | xargs)  # Trim whitespace
		if [[ -n "$segment" ]] && [[ "$segment" == *"git"* ]]; then
			if check_git_push "$segment"; then
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
	done < <(echo "$COMMAND" | PYTHONPATH="$SCRIPTS_DIR" python3 -c "
import sys
import re
# Split by shell operators, preserving quoted strings
cmd = sys.stdin.read().strip()
# Simple split - handles most cases
segments = re.split(r'\s*(?:&&|\|\||[;|])\s*', cmd)
for seg in segments:
    print(seg)
" 2>/dev/null)
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
