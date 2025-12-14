#!/bin/bash
#
# PreToolUse hook for git commit verification
#
# State machine:
#   No state file    → Block + show context-aware prompt + create state file
#   State file exists → Allow + delete state file (reset for next commit)
#
# Improvements over generic checklist:
#   1. Evidence-based: Requires articulating root cause and layer, not just
#      claiming "verified"
#   2. Contextual: Parses staged files to show relevant checks only
#   3. Structured: Demands specific format that's harder to fake
#

# Read tool input from stdin
JSON_INPUT=$(cat)

# Parse command from tool input JSON
COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only intercept git commit commands
if [[ ! "$COMMAND" == *"git commit"* ]]; then
	exit 0
fi

# State file for reminder tracking
STATE_FILE="$HOME/.claude-commit-reminder-state"

# Check if we've already shown the reminder
if [[ -f "$STATE_FILE" ]]; then
	rm -f "$STATE_FILE"
	exit 0
fi

# First attempt - analyze staged files and block with contextual prompt
touch "$STATE_FILE"

# Categorize staged files
cd "$CLAUDE_PROJECT_DIR" || exit 0

STAGED_FILES=$(git diff --cached --name-only 2>/dev/null)
if [[ -z "$STAGED_FILES" ]]; then
	exit 0  # No staged files, let git handle the error
fi

# Detect change categories
HAS_INFRA=false
HAS_CONTENT=false
HAS_ENGINE=false
HAS_WEB=false
HAS_SERVER=false
HAS_PROTOCOL=false
HAS_TESTS_ONLY=true

while IFS= read -r file; do
	case "$file" in
		package.json|pnpm-lock.yaml|.npmrc|.prettierrc|tsconfig*.json)
			HAS_INFRA=true; HAS_TESTS_ONLY=false ;;
		scripts/*|.github/*|.husky/*|.claude/*)
			HAS_INFRA=true; HAS_TESTS_ONLY=false ;;
		packages/contents/src/*|packages/contents/tests/*)
			HAS_CONTENT=true
			[[ "$file" != *test* ]] && HAS_TESTS_ONLY=false ;;
		packages/engine/src/*|packages/engine/tests/*)
			HAS_ENGINE=true
			[[ "$file" != *test* ]] && HAS_TESTS_ONLY=false ;;
		packages/web/src/*|packages/web/tests/*)
			HAS_WEB=true
			[[ "$file" != *test* ]] && HAS_TESTS_ONLY=false ;;
		packages/server/src/*|packages/server/tests/*)
			HAS_SERVER=true
			[[ "$file" != *test* ]] && HAS_TESTS_ONLY=false ;;
		packages/protocol/src/*|packages/protocol/tests/*)
			HAS_PROTOCOL=true
			[[ "$file" != *test* ]] && HAS_TESTS_ONLY=false ;;
		tests/*)
			;; # Integration tests don't flip HAS_TESTS_ONLY
		docs/*|*.md|CLAUDE.md)
			HAS_INFRA=true; HAS_TESTS_ONLY=false ;;
		*)
			HAS_TESTS_ONLY=false ;;
	esac
done <<< "$STAGED_FILES"

# Build contextual message
cat >&2 << 'HEADER'
⚠️ COMMIT BLOCKED — Verification Required

Before retrying, you must ARTICULATE (not just claim) your verification.
HEADER

# Show what was detected
echo "" >&2
echo "Staged files detected in:" >&2
$HAS_INFRA && echo "  • Infrastructure (package.json, scripts, config)" >&2
$HAS_CONTENT && echo "  • Content (game data definitions)" >&2
$HAS_ENGINE && echo "  • Engine (game logic)" >&2
$HAS_WEB && echo "  • Web (UI/client)" >&2
$HAS_SERVER && echo "  • Server (transport/session)" >&2
$HAS_PROTOCOL && echo "  • Protocol (types/contracts)" >&2
$HAS_TESTS_ONLY && echo "  • Tests only" >&2

echo "" >&2

# Evidence-based verification prompt
cat >&2 << 'EVIDENCE'
═══════════════════════════════════════════════════════════════════════
REQUIRED: State these before retrying (copy and fill in):
═══════════════════════════════════════════════════════════════════════

Verification:
- Root cause: [what was actually wrong, not just what you changed]
- Layer: [content | engine | web | server | infra]
- Files read before editing: [list the files you Read before Edit]

EVIDENCE

# Contextual checks based on detected categories
if $HAS_ENGINE || $HAS_CONTENT; then
	cat >&2 << 'GAME_LOGIC'
Game logic detected — also verify:
- No hardcoded CResource.*/CAction.* in filter logic (use properties)
- No fallbacks/defaults masking bad data
- Root cause addressed, not symptom patched

GAME_LOGIC
fi

if $HAS_WEB; then
	cat >&2 << 'WEB'
Web changes detected — also verify:
- No custom UI text (use translators)
- Web trusts protocol contracts (no defensive fallbacks for required fields)

WEB
fi

if $HAS_INFRA && ! $HAS_ENGINE && ! $HAS_CONTENT && ! $HAS_WEB && ! $HAS_SERVER; then
	cat >&2 << 'INFRA_ONLY'
Infrastructure-only changes — simplified verification:
- Confirm this is build/config, not game logic
- State what problem this solves

INFRA_ONLY
fi

if $HAS_TESTS_ONLY; then
	cat >&2 << 'TESTS_ONLY'
Test-only changes — simplified verification:
- Confirm no production code was changed
- State what the test covers

TESTS_ONLY
fi

cat >&2 << 'FOOTER'
═══════════════════════════════════════════════════════════════════════
If UNCERTAIN about expected behavior or approach — ASK the user first.
═══════════════════════════════════════════════════════════════════════
FOOTER

exit 2
