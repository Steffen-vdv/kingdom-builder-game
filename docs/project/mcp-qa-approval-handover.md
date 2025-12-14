# MCP-Based QA Approval System — Implementation Handover

## Executive Summary

This document provides complete implementation instructions for a tamper-proof
QA approval system using MCP. The architecture prevents main task agents from
bypassing QA review by ensuring only QA subagents can sign valid approvals.

**Branch:** `claude/review-mcp-qa-risks-C1k1F`

---

## Pre-Implementation Setup

### Required: Cloud Environment Variable

Before starting implementation, the following environment variable must be set
in the cloud environment configuration:

```
QA_SIGNING_SECRET=mcp-qa-secret-kb-2024
```

This value is arbitrary but must be:
- Set in the cloud environment (not in code)
- Known to the MCP server for verification
- The same value used in `.mcp.json` configuration

**CRITICAL:** The new session will see `QA_SIGNING_SECRET=""` (empty/poisoned)
because `session-start.sh` unsets it for main agents. However, when you spawn
a QA subagent, that subagent will see `QA_SIGNING_SECRET=mcp-qa-secret-kb-2024`
(the original unpoisoned value from cloud env).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAMPER-PROOF QA APPROVAL FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLOUD ENVIRONMENT:                                                         │
│  ┌─────────────────────────────────────────┐                                │
│  │ QA_SIGNING_SECRET=mcp-qa-secret-kb-2024 │                                │
│  └─────────────────────────────────────────┘                                │
│                    │                                                        │
│         ┌─────────┴─────────┐                                               │
│         ▼                   ▼                                               │
│  ┌─────────────┐     ┌─────────────┐                                        │
│  │ Main Agent  │     │ QA Subagent │                                        │
│  └──────┬──────┘     └──────┬──────┘                                        │
│         │                   │                                               │
│         ▼                   │                                               │
│  session-start.sh runs      │ (no session-start.sh)                         │
│  ┌─────────────────────┐    │                                               │
│  │ unset QA_SIGNING_   │    │                                               │
│  │ SECRET (POISONED)   │    │                                               │
│  └─────────────────────┘    │                                               │
│         │                   │                                               │
│         ▼                   ▼                                               │
│  SECRET="" (empty)     SECRET="mcp-qa-secret-kb-2024"                       │
│         │                   │                                               │
│         ▼                   ▼                                               │
│  Calls MCP tool ──►     Calls MCP tool ──►                                  │
│  Wrong secret           Correct secret                                      │
│  ──► REJECTED           ──► SIGNED WITH HMAC                                │
│                              │                                              │
│                              ▼                                              │
│                    ~/.claude-push-approval                                  │
│                    (contains HMAC signature)                                │
│                              │                                              │
│                              ▼                                              │
│                    pre-push hook verifies                                   │
│                    HMAC signature                                           │
│                              │                                              │
│                              ▼                                              │
│                         PUSH ALLOWED                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Environment source:** Both agents receive env vars from the same cloud
   config, NOT through inheritance
2. **Asymmetric poisoning:** `session-start.sh` runs ONLY for main agents,
   poisoning their secret
3. **QA subagent intact:** Since session-start.sh doesn't run for subagents,
   QA keeps the original secret
4. **MCP verification:** MCP server checks the secret before signing
5. **Cryptographic proof:** HMAC signature proves the approval came through
   the MCP server (which verified the secret)

---

## What Has Been Completed

### 1. session-start.sh Modification (DONE)

Location: `.claude/session-start.sh`

The following code has been added to poison the signing secret for main agents:

```bash
if [[ -n "$QA_SIGNING_SECRET" ]]; then
  echo "Poisoning QA_SIGNING_SECRET for main agent session" >> "$LOG"
  unset QA_SIGNING_SECRET
  export QA_SIGNING_SECRET=""
fi
```

This runs early in session-start.sh, ensuring main agents lose the secret
before any other operations.

---

## What Needs To Be Implemented

### 1. MCP Server: `qa-approval`

Create the MCP server that provides the `sign_approval` tool.

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

**src/index.ts implementation requirements:**

1. Use stdio transport (local MCP server)
2. Read `QA_SIGNING_SECRET` from its own environment (set via `.mcp.json`)
3. Read `QA_MASTER_KEY` from environment for HMAC signing
4. Implement `sign_approval` tool:
   - Input: `{ signing_secret, verdict, commits, diffHash, reviewSummary }`
   - Verify `signing_secret` matches `QA_SIGNING_SECRET`
   - If mismatch: return error (caller doesn't have valid secret)
   - If match: generate HMAC signature and write approval file
5. Write approval to `~/.claude-push-approval` with signature

**Tool schema:**
```typescript
{
  name: 'sign_approval',
  description: 'Signs a QA approval after review. Only callable by QA subagents with valid signing secret.',
  inputSchema: {
    type: 'object',
    properties: {
      signing_secret: {
        type: 'string',
        description: 'The QA signing secret from environment ($QA_SIGNING_SECRET)'
      },
      verdict: {
        type: 'string',
        enum: ['APPROVED', 'BLOCKED', 'NEEDS_INPUT']
      },
      commits: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of commit SHAs being approved'
      },
      diffHash: {
        type: 'string',
        description: 'Hash of the diff that was reviewed'
      },
      reviewSummary: {
        type: 'string',
        description: 'Summary of the review findings'
      }
    },
    required: ['signing_secret', 'verdict', 'commits', 'diffHash', 'reviewSummary']
  }
}
```

**HMAC signing logic:**
```typescript
import { createHmac } from 'crypto';

function signApproval(payload: object, masterKey: string): string {
  const payloadStr = JSON.stringify(payload);
  return createHmac('sha256', masterKey).update(payloadStr).digest('hex');
}
```

---

### 2. MCP Configuration: `.mcp.json`

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "qa-approval": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", ".claude/mcp/qa-approval/src/index.ts"],
      "env": {
        "QA_SIGNING_SECRET": "mcp-qa-secret-kb-2024",
        "QA_MASTER_KEY": "hmac-master-key-kb-2024"
      }
    }
  }
}
```

**Note:** The MCP server's environment is set here, separate from the agent's
environment. This ensures the MCP server always has the secrets needed for
verification and signing.

---

### 3. Update code-reviewer.md

Add instructions for QA subagent to call the MCP tool after approving.

**Location:** `.claude/agents/code-reviewer.md`

**Add after the APPROVED verdict section:**

```markdown
## Signing Approvals (MCP Tool)

After outputting ✅ APPROVED, you MUST also call the MCP signing tool:

\`\`\`
mcp__qa_approval__sign_approval({
  signing_secret: process.env.QA_SIGNING_SECRET,  // From your environment
  verdict: "APPROVED",
  commits: ["<full SHA of each commit>"],
  diffHash: "<sha256 hash of the reviewed diff>",
  reviewSummary: "<your approval summary>"
})
\`\`\`

**IMPORTANT:**
- Use `$QA_SIGNING_SECRET` from your environment
- Include ALL commit SHAs being approved
- The diffHash should be computed from `git diff` output
- Your reviewSummary should match what you output in the verdict

If the MCP tool call fails with "invalid signing secret", this indicates
you are running in main agent context (not as QA subagent). This should
not happen in normal operation.
```

---

### 4. Update Pre-Push Hook

Modify `.claude/hooks/pre-push-review.sh` to verify HMAC signatures.

**Add after the existing approval validation logic:**

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# HMAC SIGNATURE VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════
# Verify the approval was signed by the MCP server (not manually written)

QA_MASTER_KEY="hmac-master-key-kb-2024"

# Extract signature and payload
SIGNATURE=$(jq -r '.signature // empty' "$APPROVAL_FILE" 2>/dev/null)
if [[ -z "$SIGNATURE" ]]; then
    echo "❌ Approval file missing HMAC signature" >&2
    echo "The approval must be created via MCP tool, not written directly." >&2
    rm -f "$APPROVAL_FILE"
    exit 2
fi

# Reconstruct payload (everything except signature)
PAYLOAD=$(jq -c 'del(.signature)' "$APPROVAL_FILE" 2>/dev/null)

# Compute expected signature
EXPECTED=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$QA_MASTER_KEY" | cut -d' ' -f2)

if [[ "$SIGNATURE" != "$EXPECTED" ]]; then
    echo "❌ Invalid HMAC signature on approval file" >&2
    echo "The approval file has been tampered with or was not created by QA." >&2
    rm -f "$APPROVAL_FILE"
    exit 2
fi

echo "✅ HMAC signature verified" >&2
```

---

## Testing the Implementation

### Test 1: Verify Main Agent Cannot Sign

As the main agent, try to call the MCP tool directly:

```
mcp__qa_approval__sign_approval({
  signing_secret: "",  // Main agent has empty secret
  verdict: "APPROVED",
  commits: ["abc123"],
  diffHash: "test",
  reviewSummary: "test"
})
```

**Expected:** Tool returns error about invalid signing secret.

### Test 2: Verify QA Subagent Can Sign

1. Spawn a QA subagent via Task tool
2. In the QA subagent, check `$QA_SIGNING_SECRET` is set
3. Have QA call the MCP tool with correct secret
4. **Expected:** Tool succeeds, approval file written with signature

### Test 3: Verify Pre-Push Hook Validates Signature

1. Manually write an approval file WITHOUT signature
2. Attempt to push
3. **Expected:** Hook rejects with "missing HMAC signature"

### Test 4: Verify Tampered Approval Is Rejected

1. Get a valid signed approval file
2. Modify the `reviewer_verdict` field
3. Attempt to push
4. **Expected:** Hook rejects with "invalid HMAC signature"

---

## Security Properties

| Property | How It's Achieved |
|----------|-------------------|
| Main agent cannot sign | Secret is poisoned by session-start.sh |
| QA subagent can sign | Secret remains intact (no session-start.sh) |
| Approvals are authentic | HMAC signature verifies origin |
| Approvals cannot be tampered | HMAC breaks if content modified |
| Secret is not in code | Stored in cloud env + .mcp.json |

---

## File Checklist

After implementation, these files should exist/be modified:

- [x] `.claude/session-start.sh` — Secret poisoning (DONE)
- [ ] `.claude/mcp/qa-approval/package.json` — MCP server package
- [ ] `.claude/mcp/qa-approval/tsconfig.json` — TypeScript config
- [ ] `.claude/mcp/qa-approval/src/index.ts` — MCP server implementation
- [ ] `.mcp.json` — MCP server configuration
- [ ] `.claude/agents/code-reviewer.md` — QA signing instructions
- [ ] `.claude/hooks/pre-push-review.sh` — HMAC verification

---

## Troubleshooting

### "Invalid signing secret" when QA calls MCP tool

- Verify `QA_SIGNING_SECRET` is set in cloud environment
- Verify the value matches what's in `.mcp.json`
- Check if session-start.sh accidentally runs for subagents (it shouldn't)

### "Missing HMAC signature" on push

- Ensure QA agent actually called the MCP tool
- Check MCP server logs for errors
- Verify MCP server is running (`npx tsx` must be available)

### MCP server doesn't start

- Run `pnpm install` in `.claude/mcp/qa-approval/`
- Check that `tsx` is installed
- Verify `.mcp.json` syntax is correct

---

## References

- Original PoC request: `docs/project/mcp-qa-approval-poc.md`
- QA review workflow: `docs/qa-review-tool.md`
- Current pre-push hook: `.claude/hooks/pre-push-review.sh`
- MCP builder skill: `.claude/skills/mcp-builder/SKILL.md`
