# MCP-Based QA Approval System — PoC Implementation

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

## Solution: Secret Poisoning + Pusher Subagent

### Key Discovery

**`session-start.sh` runs ONLY for main task agents, NEVER for subagents.**

This asymmetry enables a clean solution with zero theoretical bypass.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECRET FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLOUD ENVIRONMENT:                                                         │
│  ┌────────────────────────────────────────┐                                 │
│  │ QA_SIGNING_SECRET=<secret>             │  ← Only ONE secret needed       │
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
│  POISONS secret     │           │                                           │
│        │            │           │                                           │
│        ▼            ▼           ▼                                           │
│  SECRET=""     SECRET=<val> SECRET=<val>                                    │
│        │            │           │                                           │
│        │            │           │                                           │
│  ✗ Cannot sign  ✓ Can sign  ✓ Can verify                                    │
│  ✗ Cannot push    approval    and PUSH                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
4. MCP server verifies QA_SIGNING_SECRET, writes approval file with HMAC
         │
         ▼
5. Main agent spawns Pusher subagent
         │
         ▼
6. Pusher subagent:
   - Reads approval file
   - Verifies HMAC using QA_SIGNING_SECRET (unpoisoned)
   - Executes git push
   - Returns result to main agent
```

### Why This Works

| Agent | Has Secret? | Can Sign? | Can Push? |
|-------|-------------|-----------|-----------|
| Main Agent | NO (poisoned) | NO | NO |
| QA Subagent | YES | YES | — |
| Pusher Subagent | YES | — | YES |

**Zero theoretical bypass:** Main agent cannot push because:
1. It cannot call `sign_approval` (no secret)
2. It cannot push directly (pre-push hook blocks when secret is empty)
3. It cannot forge approval file (no secret for HMAC)

---

## Completed Work

### 1. session-start.sh Modification ✓

Location: `.claude/session-start.sh`

```bash
if [[ -n "$QA_SIGNING_SECRET" ]]; then
  echo "Poisoning QA_SIGNING_SECRET for main agent session" >> "$LOG"
  unset QA_SIGNING_SECRET
  export QA_SIGNING_SECRET=""
fi
```

---

## Implementation Required

### Pre-Implementation: Cloud Environment Setup

Set this environment variable in cloud environment configuration:

```
QA_SIGNING_SECRET=<any-secure-value>
```

Example: `QA_SIGNING_SECRET=&@^!SecretMasterQASignKey!&&#@!`

### 1. Create MCP Server

**Location:** `.claude/mcp/qa-approval/`

**Structure:**
```
.claude/mcp/qa-approval/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts
```

**package.json:**
```json
{
  "name": "@kingdom-builder/qa-approval-mcp",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

**src/index.ts — Tool: `sign_approval`**

```typescript
// Called by QA subagent after approving
{
  name: 'sign_approval',
  inputSchema: {
    type: 'object',
    properties: {
      signing_secret: { type: 'string', description: 'Value of $QA_SIGNING_SECRET' },
      verdict: { type: 'string', enum: ['APPROVED'] },
      commits: { type: 'array', items: { type: 'string' } },
      diffHash: { type: 'string' },
      reviewSummary: { type: 'string' }
    },
    required: ['signing_secret', 'verdict', 'commits', 'diffHash', 'reviewSummary']
  }
}

// Implementation:
// 1. Verify signing_secret === process.env.QA_SIGNING_SECRET
// 2. If mismatch → return error (caller is poisoned main agent)
// 3. Create payload: { status, timestamp, commits, reviewer_verdict }
// 4. Generate HMAC: hmac('sha256', QA_SIGNING_SECRET).update(JSON.stringify(payload))
// 5. Write { ...payload, signature } to ~/.claude-push-approval
```

### 2. Create MCP Configuration

**Location:** `.mcp.json` (project root)

```json
{
  "mcpServers": {
    "qa-approval": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", ".claude/mcp/qa-approval/src/index.ts"]
    }
  }
}
```

### 3. Create Pusher Subagent

**Location:** `.claude/agents/pusher.md`

```markdown
---
name: pusher
description: Verifies QA approval and pushes to remote. Use after QA approval.
tools: Bash, Read
---

# Pusher Agent

You verify QA approvals and push code to remote repositories.

## Your Task

1. Read the approval file at `~/.claude-push-approval`
2. Verify the HMAC signature using `$QA_SIGNING_SECRET`
3. If valid, execute `git push`
4. Return the result

## Verification Process

```bash
# Read approval file
APPROVAL_FILE="$HOME/.claude-push-approval"

# Extract signature and payload
SIGNATURE=$(jq -r '.signature' "$APPROVAL_FILE")
PAYLOAD=$(jq -c 'del(.signature)' "$APPROVAL_FILE")

# Verify HMAC
EXPECTED=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$QA_SIGNING_SECRET" | awk '{print $2}')

if [[ "$SIGNATURE" != "$EXPECTED" ]]; then
    echo "❌ Invalid approval signature"
    exit 1
fi

# Check commits match
HEAD_SHA=$(git rev-parse HEAD)
if ! echo "$PAYLOAD" | jq -e ".commits | index(\"$HEAD_SHA\")" > /dev/null; then
    echo "❌ Approval is for different commits"
    exit 1
fi

echo "✅ Approval verified"
git push
```

## Important

- You have `$QA_SIGNING_SECRET` available (not poisoned for subagents)
- Only push if verification succeeds
- Report any errors back to the main agent
```

### 4. Update code-reviewer.md

Add after the APPROVED verdict section:

```markdown
## Signing Approvals (MCP Tool)

After outputting ✅ APPROVED, you MUST call the MCP signing tool:

mcp__qa_approval__sign_approval({
  signing_secret: "<your $QA_SIGNING_SECRET value>",
  verdict: "APPROVED",
  commits: ["<full SHA of HEAD commit>"],
  diffHash: "<sha256 of reviewed diff>",
  reviewSummary: "<your approval summary>"
})

This creates a cryptographically signed approval file that the Pusher
subagent will verify before pushing.

If the tool returns "invalid signing secret", something is wrong with
your environment — report this to the main agent.
```

### 5. Update Pre-Push Hook

Modify `.claude/hooks/pre-push-review.sh` to block direct pushes:

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# BLOCK DIRECT PUSHES FROM MAIN AGENT
# ═══════════════════════════════════════════════════════════════════════════════
# Main agent has QA_SIGNING_SECRET="" (poisoned by session-start.sh)
# Subagents have the actual secret value
# Only subagents (specifically the Pusher) should be able to push

if [[ -z "$QA_SIGNING_SECRET" ]]; then
    cat >&2 << 'BLOCKED'
╔═══════════════════════════════════════════════════════════════════════════════╗
║  🛑 DIRECT PUSH BLOCKED                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Main agents cannot push directly. Use the Pusher subagent:

1. First, ensure QA review passed and signed the approval
2. Then spawn the Pusher subagent:

   Task(subagent_type: "pusher", prompt: "Push the approved changes")

The Pusher will verify the approval signature and execute the push.
BLOCKED
    exit 2
fi

# If we reach here, caller has valid QA_SIGNING_SECRET (is a subagent)
# The Pusher subagent will handle verification internally
exit 0
```

### 6. Update CLAUDE.md

Add to the Git Operations section or QA workflow documentation:

```markdown
## Pushing Code

Main agents CANNOT push directly. After QA approval:

1. QA subagent signs the approval (creates ~/.claude-push-approval)
2. Spawn the Pusher subagent to verify and push:

   Task(subagent_type: "pusher", prompt: "Push the approved changes to origin")

The Pusher verifies the HMAC signature before pushing.
```

---

## Success Criteria

- [ ] MCP server starts and registers `sign_approval` tool
- [ ] QA subagent can call `sign_approval` (has valid secret)
- [ ] Main agent CANNOT call `sign_approval` (poisoned secret)
- [ ] Approval file contains HMAC signature
- [ ] Main agent CANNOT push directly (blocked by hook)
- [ ] Pusher subagent CAN verify and push (has valid secret)

---

## Testing

### Test 1: Main Agent Cannot Sign

From main agent, attempt:
```
mcp__qa_approval__sign_approval({
  signing_secret: "",
  ...
})
```
**Expected:** Error "invalid signing secret"

### Test 2: Main Agent Cannot Push

From main agent, attempt:
```
git push origin branch-name
```
**Expected:** "DIRECT PUSH BLOCKED" message

### Test 3: QA Subagent Can Sign

Spawn QA subagent, have it call `sign_approval` with valid secret.
**Expected:** Success, approval file written

### Test 4: Pusher Subagent Can Push

After QA approval, spawn Pusher subagent.
**Expected:** Verifies signature, executes push successfully

---

## Security Properties

| Property | Mechanism |
|----------|-----------|
| Main agent cannot sign | `QA_SIGNING_SECRET` poisoned by session-start.sh |
| Main agent cannot push | Pre-push hook checks for empty secret |
| Main agent cannot forge | No secret for HMAC generation |
| Approvals are authentic | HMAC signature with secret |
| Tampering detected | HMAC verification fails |

**Zero theoretical bypass:** The only path to pushing is through QA approval +
Pusher verification. Main agent has no access to the secret needed for either.

---

## File Checklist

- [x] `.claude/session-start.sh` — Secret poisoning
- [ ] `.claude/mcp/qa-approval/package.json`
- [ ] `.claude/mcp/qa-approval/tsconfig.json`
- [ ] `.claude/mcp/qa-approval/src/index.ts`
- [ ] `.mcp.json`
- [ ] `.claude/agents/pusher.md` — NEW: Pusher subagent
- [ ] `.claude/agents/code-reviewer.md` — MCP signing instructions
- [ ] `.claude/hooks/pre-push-review.sh` — Block direct pushes
- [ ] `CLAUDE.md` — Document new push workflow

---

## References

- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Builder Skill: `.claude/skills/mcp-builder/SKILL.md`
- QA Review Workflow: `docs/qa-review-tool.md`
- Pre-push Hook: `.claude/hooks/pre-push-review.sh`
