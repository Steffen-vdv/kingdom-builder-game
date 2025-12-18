#!/bin/bash
#
# verify-and-push.sh — Cryptographically verified git push
#
# Usage:
#   verify-and-push.sh '<payload-json>' '<signature>' [branch]
#   verify-and-push.sh --override '<token>' [branch]
#
# Normal mode:
#   1. Calls crypto-gate to verify the signature
#   2. Validates HEAD commit is in the approved payload
#   3. Executes git push if all checks pass
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

The crypto-gate binary should be downloaded by SubagentStart hook.
If you are a subagent and see this, report the error to the master-agent.
NO_BINARY
	return 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# OVERRIDE MODE
# ═══════════════════════════════════════════════════════════════════════════════

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

	# Determine branch
	if [[ -z "$BRANCH" ]]; then
		BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
	fi

	HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
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
		# Clean up QA output files for next workflow
		"$SHARED_SCRIPTS/cleanup-qa-outputs.sh" 2>/dev/null || true
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
# NORMAL MODE — SIGNATURE VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

PAYLOAD="${1:-}"
SIGNATURE="${2:-}"
BRANCH="${3:-}"

if [[ -z "$PAYLOAD" || -z "$SIGNATURE" ]]; then
	cat >&2 << 'USAGE'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ USAGE ERROR — Missing required arguments                                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Usage: verify-and-push.sh '<payload-json>' '<signature>' [branch]
       verify-and-push.sh --override '<token>' [branch]

Arguments (normal mode):
  payload    JSON string containing approval data (commits, verdict, etc.)
  signature  HMAC-SHA256 signature from crypto-gate
  branch     Optional branch name (defaults to current branch)

Arguments (override mode):
  --override Flag to enable override mode
  token      User-provided override token
  branch     Optional branch name (defaults to current branch)

Example:
  verify-and-push.sh '{"commits":["abc123"],"verdict":"APPROVED"}' 'a1b2c3...'
  verify-and-push.sh --override 'user-secret-token'
USAGE
	exit 1
fi

CRYPTO_GATE=$(find_crypto_gate) || exit 1

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY SIGNATURE VIA CRYPTO-GATE
# ═══════════════════════════════════════════════════════════════════════════════

echo "Verifying signature via crypto-gate..." >&2

# Note: Signatures are type-specific. QA_FINAL_SIGNATORY is required for deployment.
if ! "$CRYPTO_GATE" verify "$PAYLOAD" "$SIGNATURE" --type QA_FINAL_SIGNATORY; then
	cat >&2 << 'INVALID_SIG'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Invalid signature                                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The cryptographic signature verification failed.

Possible causes:
  - Signature was not created by crypto-gate
  - Payload was modified after signing
  - Wrong signature provided

WHAT TO DO:
→ Re-run QA review to get a fresh signature
→ Ensure payload is passed exactly as signed
INVALID_SIG
	exit 1
fi

echo "✓ Signature valid" >&2

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY VERDICT IS APPROVED
# ═══════════════════════════════════════════════════════════════════════════════

VERDICT=$(echo "$PAYLOAD" | jq -r '.verdict // empty' 2>/dev/null)

if [[ "$VERDICT" != "APPROVED" ]]; then
	cat >&2 << WRONG_VERDICT
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — Verdict is not APPROVED                                    ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Payload verdict: ${VERDICT:-<missing>}
Expected verdict: APPROVED

Only payloads with verdict "APPROVED" can be pushed.
A signed payload with BLOCKED or NEEDS_INPUT verdict cannot authorize a push.

WHAT TO DO:
→ Re-run QA review and address any blocking issues
→ Get a fresh signature with APPROVED verdict
WRONG_VERDICT
	exit 1
fi

echo "✓ Verdict is APPROVED" >&2

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFY HEAD COMMIT IS IN APPROVED COMMITS
# ═══════════════════════════════════════════════════════════════════════════════

HEAD_SHA=$(git rev-parse HEAD 2>/dev/null)
APPROVED_COMMITS=$(echo "$PAYLOAD" | jq -r '.commits[]?' 2>/dev/null)

if [[ -z "$APPROVED_COMMITS" ]]; then
	cat >&2 << 'NO_COMMITS'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ PUSH BLOCKED — No commits in payload                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The payload does not contain a 'commits' array.

Expected payload format:
  {"commits": ["<sha1>", ...], "verdict": "APPROVED", ...}
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
→ Get fresh signature that includes HEAD
COMMIT_MISMATCH
	exit 1
fi

echo "✓ HEAD commit is approved" >&2

# ═══════════════════════════════════════════════════════════════════════════════
# EXECUTE GIT PUSH
# ═══════════════════════════════════════════════════════════════════════════════

# Determine branch
if [[ -z "$BRANCH" ]]; then
	BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
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
	# Clean up QA output files for next workflow
	"$SHARED_SCRIPTS/cleanup-qa-outputs.sh" 2>/dev/null || true
	exit 0
else
	cat >&2 << 'PUSH_FAILED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ❌ GIT PUSH FAILED                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The signature was valid, but git push failed.

Possible causes:
  - Network issues
  - Permission denied
  - Branch protection rules

WHAT TO DO:
→ Check network connectivity
→ Verify you have push access to the remote
→ Retry the push
PUSH_FAILED
	exit 1
fi
