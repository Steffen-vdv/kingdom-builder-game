#!/bin/bash
#
# PreToolUse hook — Block dangerous git commands
#
# HARD BLOCK (no override):
#   - git push → must use verify-and-push.sh workflow
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
# SECURITY CHECK: Ensure bashlex is available for chain parsing
# Without bashlex, commands like "git status && git push" are parsed as single
# command, allowing the push to bypass this hook.
# ═══════════════════════════════════════════════════════════════════════════════

# Check if command contains chain operators (pipe needs special handling to avoid || false positive)
CONTAINS_CHAIN=false
if [[ "$COMMAND" == *"&&"* ]] || [[ "$COMMAND" == *"||"* ]] || \
   [[ "$COMMAND" == *";"* ]] || [[ "$COMMAND" =~ \|[^\|] ]]; then
	CONTAINS_CHAIN=true
fi

# If command has chains, verify bashlex is available
if [[ "$CONTAINS_CHAIN" == "true" ]]; then
	if ! python3 -c "import bashlex" 2>/dev/null; then
		cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — bashlex required for chained commands                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Your command contains shell operators (&&, ||, ;, |) but bashlex is not installed.
Without bashlex, chained git push commands cannot be properly detected.

TO FIX:
  pip3 install bashlex

Or start a new Claude Code session (SessionStart hook installs dependencies).

BLOCKED
		exit 2
	fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Parse the command using the command package (handles chains with bashlex)
# ═══════════════════════════════════════════════════════════════════════════════
PARSED=$(echo "$COMMAND" | PYTHONPATH="$SCRIPTS_DIR" python3 -m command 2>/dev/null)

# If parse failed, allow (fail-open for simple commands)
if [[ -z "$PARSED" ]]; then
	exit 0
fi

# Get number of commands in the chain
NUM_COMMANDS=$(echo "$PARSED" | jq '.commands | length')

# ═══════════════════════════════════════════════════════════════════════════════
# FAIL-CLOSED: Detect when bashlex failed and fell back to shlex
# If command contains chain operators but parsing found only 1 command,
# bashlex couldn't parse it (e.g., HEREDOC syntax) and shlex treated it as one.
# ═══════════════════════════════════════════════════════════════════════════════
if [[ "$CONTAINS_CHAIN" == "true" ]] && [[ "$NUM_COMMANDS" -eq 1 ]]; then
	cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 BLOCKED — Cannot parse chained command                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Your command contains shell operators (&&, ||, ;, |) with syntax that bashlex
cannot parse (e.g., HEREDOC, complex quoting). This prevents safe detection of
dangerous git operations like push, commit --amend, rebase, or reset.

SOLUTION:
  Run the commands separately instead of chaining them:

  1. git add <files>
  2. git commit -m "message"

This allows each command to be properly analyzed for safety.

BLOCKED
	exit 2
fi

# ═══════════════════════════════════════════════════════════════════════════════
# Check ALL commands in chain for blocked operations
# Parser uses bashlex for proper chain handling (&&, ||, ;, |)
# ═══════════════════════════════════════════════════════════════════════════════

INVALIDATES_DELTA=false
INVALIDATING_REASON=""

for ((i=0; i<NUM_COMMANDS; i++)); do
	CMD_JSON=$(echo "$PARSED" | jq ".commands[$i]")
	EXECUTABLE=$(echo "$CMD_JSON" | jq -r '.executable // empty')
	SUBCOMMAND=$(echo "$CMD_JSON" | jq -r '.subcommand // empty')

	# Skip non-git commands
	if [[ "$EXECUTABLE" != "git" ]]; then
		continue
	fi

	# ═══════════════════════════════════════════════════════════════════════════
	# HARD BLOCK: git push (no override)
	# ═══════════════════════════════════════════════════════════════════════════
	if [[ "$SUBCOMMAND" == "push" ]]; then
		# Allow verify-and-push.sh
		if [[ "$COMMAND" == *"verify-and-push"* ]]; then
			continue
		fi

		# Allow --dry-run for testing
		HAS_DRY_RUN=$(echo "$CMD_JSON" | jq -r '.flags["dry-run"] // false')
		if [[ "$HAS_DRY_RUN" == "true" ]]; then
			continue
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

	# ═══════════════════════════════════════════════════════════════════════════
	# CONDITIONAL BLOCK: Delta-invalidating commands (when QA state exists)
	# ═══════════════════════════════════════════════════════════════════════════
	case "$SUBCOMMAND" in
		commit)
			HAS_AMEND=$(echo "$CMD_JSON" | jq -r '.flags.amend // false')
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
			HAS_SQUASH=$(echo "$CMD_JSON" | jq -r '.flags.squash // false')
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
done

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
