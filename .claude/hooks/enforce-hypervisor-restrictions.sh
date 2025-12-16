#!/bin/bash
# Unified hypervisor restriction enforcement
#
# Combines the functionality of:
#   - block-hypervisor-bash.sh
#   - block-hypervisor-edit-write.sh
#   - block-hypervisor-tools.sh
#
# Uses the atomic context manager to determine agent type.
# Subagents are not restricted by this hook.
#
# Security model:
#   - Hypervisor can only orchestrate, not implement
#   - Hypervisor cannot edit/write files
#   - Hypervisor cannot execute arbitrary bash commands
#   - Hypervisor cannot read /bin/ directory (crypto-gate protection)
#   - Hypervisor can only spawn allowed subagent types

CTX_MGR="$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager"
CONTEXT=$("$CTX_MGR/get-context.sh" 2>/dev/null)

# Default to hypervisor if context manager fails (fail-closed)
if [[ -z "$CONTEXT" ]]; then
	CONTEXT="hypervisor"
fi

# Subagents are not restricted
if [[ "$CONTEXT" != "hypervisor" ]]; then
	exit 0
fi

# Parse tool info from stdin
JSON_INPUT=$(cat)
TOOL_NAME=$(echo "$JSON_INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# ─────────────────────────────────────────────────────────────────────────────
# EDIT/WRITE: Block entirely for hypervisor
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
	cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Hypervisor cannot edit or write files                              ║
╚═══════════════════════════════════════════════════════════════════════════════╝

As hypervisor, you orchestrate — you do not implement.

Delegate file modifications to the coder subagent.

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
	exit 2
fi

# ─────────────────────────────────────────────────────────────────────────────
# GLOB/READ: Block access to /bin/ directory (crypto-gate protection)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$TOOL_NAME" == "Glob" || "$TOOL_NAME" == "Read" ]]; then
	# Extract path/pattern from tool input
	FILE_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.file_path // empty')
	PATTERN=$(echo "$JSON_INPUT" | jq -r '.tool_input.pattern // empty')
	GLOB_PATH=$(echo "$JSON_INPUT" | jq -r '.tool_input.path // empty')

	# Check for /bin/ access attempts
	for path in "$FILE_PATH" "$PATTERN" "$GLOB_PATH"; do
		if [[ -n "$path" ]]; then
			if [[ "$path" == *"/bin/"* || "$path" == "bin/"* ]]; then
				cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Hypervisor cannot access bin/ directory                            ║
╚═══════════════════════════════════════════════════════════════════════════════╝

The bin/ directory contains security-sensitive binaries that are
only accessible to subagents.

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
				exit 2
			fi
		fi
	done
	# Glob and Read are allowed otherwise
	exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# BASH: Allow only read-only commands
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$TOOL_NAME" == "Bash" ]]; then
	COMMAND=$(echo "$JSON_INPUT" | jq -r '.tool_input.command // empty')

	# Whitelist: read-only commands hypervisor MAY use
	ALLOWED_PATTERNS=(
		"^git (status|log|diff|branch|show|rev-parse)"
		"^ls "
		"^ls$"
		"^pwd$"
		"^echo "
		"^cat "
	)

	for pattern in "${ALLOWED_PATTERNS[@]}"; do
		if [[ "$COMMAND" =~ $pattern ]]; then
			exit 0
		fi
	done

	# Block everything else
	cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Hypervisor cannot execute implementation commands                  ║
╚═══════════════════════════════════════════════════════════════════════════════╝

As hypervisor, you orchestrate — you do not implement.

Delegate to appropriate subagent:
  - Code changes      -> coder
  - Running tests     -> test-runner
  - Pushing           -> pusher
  - Deep analysis     -> mastermind
  - Quick lookups     -> minimind

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
	exit 2
fi

# ─────────────────────────────────────────────────────────────────────────────
# TASK: Validate subagent_type allowlist
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$TOOL_NAME" == "Task" ]]; then
	SUBAGENT_TYPE=$(echo "$JSON_INPUT" | jq -r \
		'.tool_input.subagent_type // empty')

	# Allowlist of valid subagent_types
	ALLOWED_SUBAGENTS=(
		"mastermind"
		"minimind"
		"coder"
		"test-runner"
		"code-reviewer"
		"pusher"
		"workflow-efficiency-inspector"
	)

	for allowed in "${ALLOWED_SUBAGENTS[@]}"; do
		if [[ "$SUBAGENT_TYPE" == "$allowed" ]]; then
			exit 0
		fi
	done

	cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Invalid subagent_type: $SUBAGENT_TYPE
╚═══════════════════════════════════════════════════════════════════════════════╝

Valid subagent_types are:
  - mastermind                    (deep analysis, planning)
  - minimind                      (quick lookups, exploration)
  - coder                         (code implementation)
  - test-runner                   (running and analyzing tests)
  - code-reviewer                 (QA review)
  - pusher                        (push verification)
  - workflow-efficiency-inspector (meta-analysis of agent workflows)

Re-read: .claude/agents/hypervisor/docs/hypervisor.md (Section 4)
BLOCKED
	exit 2
fi

# ─────────────────────────────────────────────────────────────────────────────
# OTHER TOOLS: Block unless in allowed list
# ─────────────────────────────────────────────────────────────────────────────
ALLOWED_TOOLS=("Task" "Read" "Glob" "Grep")

for allowed in "${ALLOWED_TOOLS[@]}"; do
	if [[ "$TOOL_NAME" == "$allowed" ]]; then
		exit 0
	fi
done

# Block unknown/unauthorized tools
cat >&2 << BLOCKED
╔═══════════════════════════════════════════════════════════════════════════════╗
║  BLOCKED — Hypervisor cannot use tool: $TOOL_NAME
╚═══════════════════════════════════════════════════════════════════════════════╝

As hypervisor, you may only use: Task, Read, Glob, Grep

Delegate implementation work to appropriate subagent:
  - Code changes      -> coder
  - Running tests     -> test-runner
  - Pushing           -> pusher
  - Deep analysis     -> mastermind
  - Quick lookups     -> minimind

Re-read: .claude/agents/hypervisor/docs/hypervisor.md
BLOCKED
exit 2
