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
Task Agent → spawns QA Subagent → QA reviews → QA calls MCP tool →
MCP server verifies secret & writes signed approval → hook verifies → push succeeds
```

---

## Solution: Secret Poisoning via SessionStart Hook

### Key Discovery

**`session-start.sh` runs ONLY for main task agents, NEVER for QA subagents.**

This asymmetry enables a clean solution:

1. Cloud environment provides secrets to ALL agents
2. `session-start.sh` "poisons" (unsets) the signing secret for main agents
3. QA subagents retain the original secret (no session-start.sh runs)
4. MCP server verifies the secret before signing approvals

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECRET FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CLOUD ENVIRONMENT:                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ QA_SIGNING_SECRET=<auth-secret>    ← For MCP tool authentication     │   │
│  │ QA_MASTER_KEY=<hmac-key>           ← For HMAC signing (NOT poisoned) │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
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
│  │                     │    │                                               │
│  │ QA_MASTER_KEY       │    │                                               │
│  │ remains intact      │    │                                               │
│  └─────────────────────┘    │                                               │
│         │                   │                                               │
│         ▼                   ▼                                               │
│  QA_SIGNING_SECRET=""   QA_SIGNING_SECRET=<auth-secret>                     │
│  QA_MASTER_KEY=<key>    QA_MASTER_KEY=<key>                                 │
│         │                   │                                               │
│         ▼                   ▼                                               │
│  Calls MCP tool ──►     Calls MCP tool ──►                                  │
│  Secret empty/wrong     Secret correct                                      │
│  ──► REJECTED           ──► HMAC SIGNED                                     │
│                              │                                              │
│                              ▼                                              │
│                    ~/.claude-push-approval                                  │
│                    (contains HMAC signature)                                │
│                              │                                              │
│         ┌────────────────────┘                                              │
│         ▼                                                                   │
│  Pre-push hook runs (main agent context)                                    │
│  Uses QA_MASTER_KEY (NOT poisoned) to verify HMAC                           │
│         │                                                                   │
│         ▼                                                                   │
│    PUSH ALLOWED                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Two-Secret Design

| Secret | Purpose | Poisoned? | Who Has It |
|--------|---------|-----------|------------|
| `QA_SIGNING_SECRET` | MCP tool authentication | YES (main agent only) | QA subagent, MCP server |
| `QA_MASTER_KEY` | HMAC signing & verification | NO | All agents, MCP server, pre-push hook |

**Why two secrets?**

- `QA_SIGNING_SECRET` poisoning prevents main agent from calling MCP tool
- `QA_MASTER_KEY` must remain available for pre-push hook to verify signatures
- Main agent has `QA_MASTER_KEY` but cannot call MCP tool (no `QA_SIGNING_SECRET`)
- Intentional forgery would require writing bypass code (acceptable for PoC)

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

This code runs early in session-start.sh, ensuring main agents lose the
signing secret before any operations.

---

## Implementation Required

### Pre-Implementation: Cloud Environment Setup

Set these environment variables in the cloud environment configuration:

```
QA_SIGNING_SECRET=mcp-qa-auth-secret-2024
QA_MASTER_KEY=mcp-qa-hmac-key-2024
```

These values are examples; use any secure values.

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

**src/index.ts requirements:**

1. Use stdio transport
2. Read `QA_SIGNING_SECRET` and `QA_MASTER_KEY` from environment
3. Implement `sign_approval` tool:
   - Input: `{ signing_secret, verdict, commits, diffHash, reviewSummary }`
   - Verify `signing_secret === process.env.QA_SIGNING_SECRET`
   - If mismatch: return error
   - If match: generate HMAC signature using `QA_MASTER_KEY`
   - Write approval file to `~/.claude-push-approval`

**Tool schema:**
```typescript
{
  name: 'sign_approval',
  inputSchema: {
    type: 'object',
    properties: {
      signing_secret: { type: 'string', description: 'Value of $QA_SIGNING_SECRET' },
      verdict: { type: 'string', enum: ['APPROVED', 'BLOCKED', 'NEEDS_INPUT'] },
      commits: { type: 'array', items: { type: 'string' } },
      diffHash: { type: 'string' },
      reviewSummary: { type: 'string' }
    },
    required: ['signing_secret', 'verdict', 'commits', 'diffHash', 'reviewSummary']
  }
}
```

**HMAC signing:**
```typescript
import { createHmac } from 'crypto';
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function signApproval(payload: object): string {
  const masterKey = process.env.QA_MASTER_KEY;
  if (!masterKey) throw new Error('QA_MASTER_KEY not set');

  const payloadStr = JSON.stringify(payload);
  return createHmac('sha256', masterKey).update(payloadStr).digest('hex');
}

function writeApprovalFile(verdict: string, commits: string[], reviewSummary: string) {
  const payload = {
    status: verdict,
    timestamp: new Date().toISOString(),
    commits,
    reviewer_verdict: reviewSummary
  };

  const signature = signApproval(payload);
  const fileContent = { ...payload, signature };

  const approvalPath = join(homedir(), '.claude-push-approval');
  writeFileSync(approvalPath, JSON.stringify(fileContent, null, 2));

  return approvalPath;
}
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

**Note:** No `env` section needed — MCP server inherits environment from
the cloud config, which includes both secrets.

### 3. Update code-reviewer.md

Add after the APPROVED verdict section:

```markdown
## Signing Approvals (MCP Tool)

After outputting ✅ APPROVED, you MUST call the MCP signing tool:

mcp__qa_approval__sign_approval({
  signing_secret: "<your $QA_SIGNING_SECRET value>",
  verdict: "APPROVED",
  commits: ["<full SHA of each commit>"],
  diffHash: "<sha256 of reviewed diff>",
  reviewSummary: "<your approval summary>"
})

If the tool returns "invalid signing secret", you are running in main agent
context — this should not happen during normal QA review.
```

### 4. Update Pre-Push Hook

Add HMAC verification to `.claude/hooks/pre-push-review.sh`:

```bash
# ═══════════════════════════════════════════════════════════════════════════════
# HMAC SIGNATURE VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════

if [[ -z "$QA_MASTER_KEY" ]]; then
    echo "⚠️ QA_MASTER_KEY not set - skipping signature verification" >&2
    # Fall through to existing validation (for backwards compatibility)
else
    SIGNATURE=$(jq -r '.signature // empty' "$APPROVAL_FILE" 2>/dev/null)
    if [[ -z "$SIGNATURE" ]]; then
        echo "❌ Approval file missing HMAC signature" >&2
        rm -f "$APPROVAL_FILE"
        exit 2
    fi

    # Reconstruct payload and verify
    PAYLOAD=$(jq -c 'del(.signature)' "$APPROVAL_FILE" 2>/dev/null)
    EXPECTED=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$QA_MASTER_KEY" | awk '{print $2}')

    if [[ "$SIGNATURE" != "$EXPECTED" ]]; then
        echo "❌ Invalid HMAC signature" >&2
        rm -f "$APPROVAL_FILE"
        exit 2
    fi

    echo "✅ HMAC signature verified" >&2
fi
```

---

## Success Criteria

- [ ] MCP server starts and registers `sign_approval` tool
- [ ] Main agent calling MCP tool fails (empty `QA_SIGNING_SECRET`)
- [ ] QA subagent calling MCP tool succeeds (has valid secret)
- [ ] Approval file contains HMAC signature
- [ ] Pre-push hook verifies signature correctly
- [ ] Missing/invalid signatures are rejected

---

## Testing

### Test 1: Main Agent Cannot Sign

From main agent, attempt:
```
mcp__qa_approval__sign_approval({
  signing_secret: "",
  verdict: "APPROVED",
  commits: ["test"],
  diffHash: "test",
  reviewSummary: "test"
})
```
**Expected:** Error "invalid signing secret"

### Test 2: QA Subagent Can Sign

1. Spawn QA subagent via Task tool
2. Have QA echo `$QA_SIGNING_SECRET` (should be non-empty)
3. Call MCP tool with valid secret
4. **Expected:** Success, approval file written with signature

### Test 3: Signature Verification

1. Manually write approval file WITHOUT signature
2. Attempt push
3. **Expected:** "missing HMAC signature" error

---

## Security Properties

| Property | Mechanism |
|----------|-----------|
| Main agent cannot sign | `QA_SIGNING_SECRET` poisoned by session-start.sh |
| QA subagent can sign | Secret intact (no session-start.sh) |
| Approvals are authentic | HMAC signature proves MCP server origin |
| Tampering detected | HMAC verification fails if content modified |

**Known Limitation (PoC):** Main agent has `QA_MASTER_KEY` and could
theoretically forge signatures by writing code to bypass the MCP flow.
This requires intentional circumvention, not accidental bypass.

---

## File Checklist

- [x] `.claude/session-start.sh` — Secret poisoning
- [ ] `.claude/mcp/qa-approval/package.json`
- [ ] `.claude/mcp/qa-approval/tsconfig.json`
- [ ] `.claude/mcp/qa-approval/src/index.ts`
- [ ] `.mcp.json`
- [ ] `.claude/agents/code-reviewer.md` — MCP signing instructions
- [ ] `.claude/hooks/pre-push-review.sh` — HMAC verification

---

## References

- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Builder Skill: `.claude/skills/mcp-builder/SKILL.md`
- QA Review Workflow: `docs/qa-review-tool.md`
- Pre-push Hook: `.claude/hooks/pre-push-review.sh`
