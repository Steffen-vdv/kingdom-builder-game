# MCP-Based QA Approval System — Implementation

## Problem Statement

Task agents can bypass QA review by directly writing to `~/.claude-push-approval`.
The pre-push hook validates the file exists but cannot verify it was written by
the QA subagent after a legitimate review.

**Current flow (vulnerable):**

```
Task Agent → writes approval file directly → push succeeds
```

**Desired flow (tamper-proof):**

```
Task Agent → spawns QA Subagent → QA reviews & signs approval →
Task Agent → spawns Pusher Subagent → Pusher verifies & pushes
```

---

## Solution: Marker-Based Identification + Secret Protection

### Key Discovery

**`session-start.sh` runs ONLY for main task agents, NEVER for subagents.**

This asymmetry enables a marker-based security model.

> **Note:** The original "secret poisoning" approach (setting `QA_SIGNING_SECRET=""`
> in `session-start.sh`) did NOT work because subprocess env changes don't affect
> the parent process. The marker-based approach was developed as the solution.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MARKER-BASED SECURITY MODEL                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLOUD ENVIRONMENT:                                                         │
│  ┌────────────────────────────────────────┐                                 │
│  │ QA_SIGNING_SECRET=<secret>             │  ← Set in environment           │
│  └────────────────────────────────────────┘                                 │
│                    │                                                        │
│         ┌─────────┼─────────┬─────────────┐                                 │
│         ▼         ▼         ▼             │                                 │
│  ┌───────────┐ ┌────────┐ ┌────────────┐                                    │
│  │Main Agent │ │QA Sub  │ │Pusher Sub  │                                    │
│  └─────┬─────┘ └────┬───┘ └─────┬──────┘                                    │
│        │            │           │                                           │
│        ▼            │           │                                           │
│  session-start.sh   │ (no hook) │ (no hook)                                 │
│  CREATES MARKER     │           │                                           │
│        │            │           │                                           │
│        ▼            ▼           ▼                                           │
│  HAS MARKER      NO MARKER   NO MARKER                                      │
│        │            │           │                                           │
│        │            │           │                                           │
│  ✗ Cannot access ✓ Can sign  ✓ Can verify                                   │
│    secret          approval    and PUSH                                     │
│  ✗ Cannot push                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Marker File**: `session-start.sh` creates `~/.claude-main-agent-marker`
2. **Secret Guard Hook**: `qa-secret-guard.sh` blocks:
   - ALL agents from accessing `QA_SIGNING_SECRET` via bash
   - ALL agents from touching the marker file
   - Main agents from environment enumeration
3. **Pre-Push Hook**: Blocks main agents (has marker), verifies HMAC for subagents
4. **MCP Tools**: Read secret from env directly (no parameter passing)

### Flow

```
1. Main agent completes work, ready to push
         │
         ▼
2. Main agent spawns QA subagent (code-reviewer)
         │
         ▼
3. QA subagent reviews code
   - If BLOCKED → returns to main agent, no approval
   - If APPROVED → calls MCP sign_approval() tool
         │
         ▼
4. MCP server reads QA_SIGNING_SECRET from env, writes approval file with HMAC
         │
         ▼
5. Main agent spawns Pusher subagent
         │
         ▼
6. Pusher subagent:
   - Calls MCP verify_and_push() tool
   - MCP reads approval file, verifies HMAC
   - Executes git push
   - Returns result to main agent
```

### Why This Works

| Agent           | Has Marker? | Can Access Secret? | Can Sign? | Can Push? |
| --------------- | ----------- | ------------------ | --------- | --------- |
| Main Agent      | YES         | NO (blocked)       | NO        | NO        |
| QA Subagent     | NO          | via MCP only       | YES       | —         |
| Pusher Subagent | NO          | via MCP only       | —         | YES       |

**Security guarantees:**

1. Main agent cannot access secret (blocked by `qa-secret-guard.sh`)
2. Main agent cannot push directly (blocked by `pre-push-review.sh`)
3. Main agent cannot forge approval file (no secret for HMAC)
4. Subagents cannot leak secret (blocked from echoing via bash)

---

## Implementation Details

### 1. session-start.sh — Marker Creation

Location: `.claude/session-start.sh`

```bash
MARKER_FILE="$HOME/.claude-main-agent-marker"
echo "{\"created\":\"$(date -Iseconds)\",\"type\":\"main-agent\"}" > "$MARKER_FILE"
chmod 644 "$MARKER_FILE"
```

### 2. qa-secret-guard.sh — Secret Protection Hook

Location: `.claude/hooks/qa-secret-guard.sh`

**Blocks:**

- ALL agents from `echo $QA_SIGNING_SECRET` or similar
- ALL agents from reading/writing/editing marker file
- Main agents from environment enumeration (`env`, `printenv`, `set`)

### 3. MCP Server — Tool Implementation

Location: `.claude/mcp/qa-approval/src/index.ts`

**Tools:**

- `sign_approval` — Called by QA subagent after approving
- `verify_and_push` — Called by Pusher subagent to verify + push

**Key features:**

- Reads `QA_SIGNING_SECRET` directly from `process.env`
- Checks for marker file to block main agents
- Generates/verifies HMAC-SHA256 signatures

### 4. Pre-Push Hook — Defense in Depth

Location: `.claude/hooks/pre-push-review.sh`

**Verifications:**

1. Blocks main agents (marker file exists)
2. For subagents: verifies approval file exists
3. Verifies HMAC signature
4. Verifies HEAD commit is in approved commits

---

## Fixed Issues (December 2024)

### Fix 1: Resumed Sessions Marker Creation

**Issue:** `session-start.sh` only runs on fresh startup, not resume/compact.
Main agents in resumed sessions had no marker file and could bypass restrictions.

**Fix:** Added marker creation to `session-handover.sh` (runs on resume/compact).
The marker is created if it doesn't already exist.

### Fix 2: Bash Variable Indirection Bypass

**Issue:** The literal string check could be bypassed using bash indirection:

- `${!VAR}` - indirect variable expansion
- `eval "echo \$CONSTRUCTED_VAR"` - eval with dynamic variable names

**Fix:** Structural blocking of the language features that enable indirection:

- Block any command containing `${!` (indirect expansion syntax)
- Block any command using `eval` keyword

This is a structural fix - we block the mechanisms, not patterns.

### Fix 3: MCP Tool Missing from Code-Reviewer

**Issue:** The `code-reviewer.md` agent definition didn't include
`mcp__qa_approval__sign_approval` in its tools list.

**Fix:** Added the MCP tool to the code-reviewer's tools list.

---

## Known Issue: MCP Tool Availability

**Issue:** MCP tools may not be available to subagents in some environments.

Both subagents report that MCP tools are NOT in their tool sets despite being
configured in `.mcp.json` and listed in agent `.md` files.

**Workaround:** Subagents report this as an environment configuration issue and
instruct the main agent to inform the user.

**To investigate:**

- Check `.mcp.json` configuration
- Verify MCP server starts correctly
- Check Claude Code MCP integration settings
- Verify subagents can inherit MCP server connections (may be a platform limitation)

---

## Testing Instructions

### Prerequisites

1. Environment variable `QA_SIGNING_SECRET` must be set
2. Fresh session (to trigger `session-start.sh`)

### Test 1: Main Agent Cannot Access Secret

```bash
# Attempt from main agent:
echo "$QA_SIGNING_SECRET"
```

**Expected:** Blocked by `qa-secret-guard.sh` with "ACCESS DENIED" message

### Test 2: Main Agent Cannot Push Directly

```bash
# Attempt from main agent:
git push origin branch-name
```

**Expected:** Blocked by `pre-push-review.sh` with instructions to use workflow

### Test 3: Main Agent Cannot Touch Marker

```bash
# Attempt from main agent:
cat ~/.claude-main-agent-marker
rm ~/.claude-main-agent-marker
```

**Expected:** Blocked by `qa-secret-guard.sh`

### Test 4: QA Subagent Can Sign (if MCP available)

1. Make a small code change and commit
2. Spawn QA subagent: `Task(subagent_type: "code-reviewer", ...)`
3. QA reviews and calls `mcp__qa_approval__sign_approval`

**Expected:** Approval file written with valid HMAC signature

### Test 5: Pusher Subagent Can Push (if MCP available)

1. After QA approval, spawn Pusher: `Task(subagent_type: "pusher", ...)`
2. Pusher calls `mcp__qa_approval__verify_and_push`

**Expected:** Push succeeds

### Test 6: MCP Tool Availability Check

Have subagents report their available tools.

**If MCP tools missing:** Report as environment configuration issue

---

## Security Properties

| Property                 | Mechanism                                       |
| ------------------------ | ----------------------------------------------- |
| Main agent cannot sign   | Marker file + MCP tool blocks main agents       |
| Main agent cannot push   | Pre-push hook checks for marker file            |
| Main agent cannot forge  | Cannot access secret (blocked by guard hook)    |
| Secret not leakable      | All agents blocked from echoing secret via bash |
| Approvals are authentic  | HMAC signature with secret                      |
| Tampering detected       | HMAC verification fails                         |
| Prompt injection defense | Pre-push hook verifies HMAC even for subagents  |

**Defense-in-depth:** Multiple layers of protection:

1. `qa-secret-guard.sh` blocks secret access
2. `pre-push-review.sh` blocks direct push + verifies HMAC
3. MCP tools check marker file before executing
4. Marker file itself is protected from tampering

---

## File Checklist

- [x] `.claude/session-start.sh` — Marker file creation
- [x] `.claude/hooks/qa-secret-guard.sh` — Secret and marker protection
- [x] `.claude/hooks/pre-push-review.sh` — Push blocking + HMAC verification
- [x] `.claude/mcp/qa-approval/src/index.ts` — MCP server implementation
- [x] `.mcp.json` — MCP server configuration
- [x] `.claude/settings.json` — Hook configuration
- [x] `.claude/agents/pusher.md` — Pusher subagent definition
- [x] `.claude/agents/code-reviewer.md` — MCP signing instructions
- [x] `docs/qa-review-tool.md` — Main agent workflow documentation

---

## References

- Push Workflow Guide: `docs/qa-review-tool.md`
- Test Results: `docs/project/test-qa-system.md`
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
