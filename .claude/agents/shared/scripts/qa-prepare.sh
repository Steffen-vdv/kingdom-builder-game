#!/bin/bash
#
# qa-prepare.sh - Prepare canonical input for QA workflow
# Test comment for full QA workflow verification - safe to delete
#
# Master agent MUST run this before dispatching Phase 1 reviewers.
# Creates /tmp/claude/qa/current/input.json with:
#   - branch, head, commits, files_changed (from git)
#   - prompts (user's actual prompts from session log)
#   - summary (master agent's description of what was implemented)
#
# Usage:
#   qa-prepare.sh --summary "Refactored parser to use bashlex..."
#
# The summary is required and should describe what was implemented.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/qa-hook-lib.sh"

# =============================================================================
# ARGUMENT PARSING
# =============================================================================

SUMMARY=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--summary)
			SUMMARY="$2"
			shift 2
			;;
		--summary=*)
			SUMMARY="${1#*=}"
			shift
			;;
		-h|--help)
			cat << 'USAGE'
qa-prepare.sh - Prepare canonical input for QA workflow

USAGE:
  qa-prepare.sh --summary "Description of what was implemented..."

OPTIONS:
  --summary    Required. Master agent's summary of the implementation.
               This is informational context for reviewers, NOT authoritative.
               User prompts always take precedence over this summary.

EXAMPLE:
  qa-prepare.sh --summary "Migrated regex parsing to bashlex for proper shell chain handling"

OUTPUT:
  Creates /tmp/claude/qa/current/input.json with:
    - branch: current git branch
    - head: current HEAD SHA
    - commits: commits on this branch
    - files_changed: files modified in those commits
    - prompts: user's actual prompts (authoritative intent)
    - summary: master agent's description (informational only)
USAGE
			exit 0
			;;
		*)
			echo "ERROR: Unknown option: $1" >&2
			echo "Use --help for usage information" >&2
			exit 1
			;;
	esac
done

# =============================================================================
# VALIDATION
# =============================================================================

if [[ -z "$SUMMARY" ]]; then
	cat >&2 << 'ERROR'
ERROR: --summary is required

Master agent must provide a summary of what was implemented.
This helps QA reviewers understand the changes.

Example:
  qa-prepare.sh --summary "Refactored X to use Y for better Z"

ERROR
	exit 1
fi

# =============================================================================
# GATHER DATA
# =============================================================================

# Initialize paths first (creates directories if needed)
qa_paths_init

# Get current HEAD
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
if [[ -z "$HEAD_SHA" ]]; then
	echo "ERROR: Not in a git repository or HEAD not found" >&2
	exit 1
fi

# Get current branch
BRANCH=$(qa_current_branch)
if [[ -z "$BRANCH" ]]; then
	echo "ERROR: Could not determine current branch" >&2
	exit 1
fi

# Get commits on this branch
COMMITS=$(qa_current_commits_json "$BRANCH")

# Get files changed
FILES_CHANGED=$(qa_files_changed_json)

# Get user prompts from session log (fixed file, no session ID needed)
PROMPTS=$(qa_prompts_from_log)

# =============================================================================
# WRITE CANONICAL INPUT
# =============================================================================

INPUT_FILE="$QA_CURRENT_DIR/input.json"
HASH_FILE="$QA_CURRENT_DIR/input.sha256"

# Build input JSON
INPUT_JSON=$(jq -n -c \
	--arg branch "$BRANCH" \
	--arg head "$HEAD_SHA" \
	--argjson commits "$COMMITS" \
	--argjson files_changed "$FILES_CHANGED" \
	--argjson prompts "$PROMPTS" \
	--arg summary "$SUMMARY" \
	'{
		branch: $branch,
		head: $head,
		commits: $commits,
		files_changed: $files_changed,
		prompts: $prompts,
		summary: $summary
	}')

# Canonicalize for consistent hashing
CANONICAL=$(qa_canonicalize_json "$INPUT_JSON")

# Write atomically
TMP_INPUT="${INPUT_FILE}.tmp.$$"
TMP_HASH="${HASH_FILE}.tmp.$$"

# Write file WITHOUT trailing newline for consistent hashing
printf '%s' "$CANONICAL" > "$TMP_INPUT"
INPUT_HASH=$(qa_sha256_file "$TMP_INPUT")
echo "$INPUT_HASH" > "$TMP_HASH"

mv "$TMP_INPUT" "$INPUT_FILE"
mv "$TMP_HASH" "$HASH_FILE"

# Clean up any stale delta files from previous runs
rm -rf "$QA_DELTA_DIR" 2>/dev/null || true
mkdir -p "$QA_DELTA_DIR"

# =============================================================================
# OUTPUT
# =============================================================================

cat << EOF
QA preparation complete.

Branch:  $BRANCH
HEAD:    $HEAD_SHA
Commits: $(echo "$COMMITS" | jq 'length') commit(s)
Files:   $(echo "$FILES_CHANGED" | jq 'length') file(s) changed
Prompts: $(echo "$PROMPTS" | jq 'length') user prompt(s)

Input written to: $INPUT_FILE

You may now dispatch Phase 1 reviewers.
EOF
