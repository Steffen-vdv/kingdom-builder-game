# MCP-Based QA Approval System — PoC Request

## Context

This document requests a proof-of-concept implementation for a tamper-proof QA
approval system using MCP (Model Context Protocol). The goal is to prevent task
agents from faking QA approval by having only the QA subagent able to write
valid approval tokens.

**Scope:** PoC only. Staging and committing accepted. **Do not push.**

---

## Problem Statement

Currently, task agents can bypass QA review by directly writing to
`~/.claude-push-approval`. The pre-push hook validates the file exists but
cannot verify it was written by the QA subagent after a legitimate review.

**Current flow (vulnerable):**

```
Task Agent → writes approval file directly → push succeeds
```

**Desired flow (tamper-proof):**

```
Task Agent → spawns QA Subagent → QA reviews → QA calls MCP tool →
MCP server writes signed approval → hook verifies signature → push succeeds
```

---

## Constraints Discovered

| Constraint                               | Impact                                                     |
| ---------------------------------------- | ---------------------------------------------------------- |
| MCP tools are globally available         | Cannot restrict an MCP tool to only QA subagent            |
| PreToolUse hooks fire for ALL tool calls | Hooks cannot distinguish main agent from subagent reliably |
| Subagent filesystem is isolated          | Subagent cannot write files main agent reads directly      |
| `permissionMode: bypassPermissions`      | Bypasses user prompts, NOT hooks                           |

**Key insight:** The only verifiable difference between main agent and QA
subagent is the PROCESS CONTEXT (PPID). Hooks can potentially detect this,
but reliability is uncertain.

---

## Proposed Architecture

### Components

1. **qa-approval MCP server** (TypeScript, stdio transport)
   - Single tool: `sign_approval(verdict, commits, diff_hash)`
   - Server holds a secret key for HMAC signing
   - Writes `~/.claude-push-approval` with signature
   - Optionally checks calling context via environment variables

2. **PreToolUse hook** (guards against main agent misuse)
   - Intercepts calls to `mcp__qa_approval__sign_approval`
   - Attempts to detect if caller is main agent (via PPID)
   - Blocks main agent, allows subagent (if detection works)

3. **Pre-push hook update**
   - Reads signature from approval file
   - Verifies HMAC using public key / shared secret
   - Rejects unsigned or invalid approvals

### MCP Server Structure

```
.claude/mcp/qa-approval/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts        # MCP server implementation
└── README.md           # Setup instructions
```

### Tool Schema

```typescript
{
  name: 'sign_approval',
  description: 'Signs a QA approval after review (QA subagent only)',
  inputSchema: z.object({
    verdict: z.enum(['APPROVED', 'BLOCKED', 'NEEDS_INPUT']),
    commits: z.array(z.string()),
    diffHash: z.string(),
    reviewSummary: z.string()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    approvalPath: z.string().optional(),
    error: z.string().optional()
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true
  }
}
```

---

## PoC Scope

### In Scope (implement these)

1. **Basic MCP server** that:
   - Registers the `sign_approval` tool
   - Generates HMAC signature using hardcoded secret (PoC only)
   - Writes approval file to `~/.claude-push-approval`
   - Returns success/failure response

2. **MCP configuration** in `.mcp.json`:

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

3. **Update code-reviewer.md** to instruct QA subagent to call
   `mcp__qa_approval__sign_approval` after approving

4. **Basic signature verification** in pre-push hook

### Out of Scope (defer to full implementation)

- PreToolUse hook for blocking main agent (needs testing)
- Secret key management (use hardcoded for PoC)
- Key rotation strategy
- Comprehensive error handling
- Integration tests

---

## Implementation Steps

### Step 1: Create MCP Server

Create `.claude/mcp/qa-approval/` with:

**package.json:**

```json
{
	"name": "@kingdom-builder/qa-approval-mcp",
	"version": "0.1.0",
	"type": "module",
	"scripts": {
		"start": "tsx src/index.ts"
	},
	"dependencies": {
		"@anthropic-ai/sdk": "^0.x",
		"zod": "^3.x"
	},
	"devDependencies": {
		"tsx": "^4.x",
		"typescript": "^5.x"
	}
}
```

**src/index.ts:** (see MCP SDK docs for stdio server pattern)

- Initialize MCP server with stdio transport
- Register `sign_approval` tool
- Implement HMAC signing using crypto module
- Write approval file on success

### Step 2: Configure MCP

Add `.mcp.json` to project root (or update if exists).

### Step 3: Update QA Agent Instructions

In `.claude/agents/code-reviewer.md`, add section:

```markdown
## After Approving

When you output ✅ APPROVED, also call the MCP tool to sign the approval:

\`\`\`
mcp**qa_approval**sign_approval({
verdict: "APPROVED",
commits: ["<sha1>", ...],
diffHash: "<hash of reviewed diff>",
reviewSummary: "<your approval summary>"
})
\`\`\`

This creates a cryptographically signed approval token.
```

### Step 4: Update Pre-Push Hook

Add signature verification to `.claude/hooks/pre-push-review.sh`:

```bash
# Verify signature (PoC - hardcoded secret)
SECRET="poc-secret-replace-in-production"
PAYLOAD=$(jq -r 'del(.signature)' "$APPROVAL_FILE")
EXPECTED=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)
ACTUAL=$(jq -r '.signature' "$APPROVAL_FILE")

if [[ "$EXPECTED" != "$ACTUAL" ]]; then
    echo "Invalid approval signature" >&2
    exit 2
fi
```

---

## Success Criteria

The PoC is successful if:

1. [ ] MCP server starts and registers tool
2. [ ] QA subagent can call `sign_approval` tool
3. [ ] Approval file is written with valid HMAC signature
4. [ ] Pre-push hook validates signature correctly
5. [ ] Invalid/missing signatures are rejected

---

## Known Risks

| Risk                               | Mitigation                           |
| ---------------------------------- | ------------------------------------ |
| Main agent can also call MCP tool  | Defer to full impl (PreToolUse hook) |
| Secret in code is insecure         | PoC only; use env vars in production |
| MCP server crash blocks all pushes | Add fallback / manual override       |

---

## References

- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Best Practices: `.claude/skills/mcp-builder/SKILL.md`
- Current QA workflow: `docs/qa-review-tool.md`
- Pre-push hook: `.claude/hooks/pre-push-review.sh`
