# Cryptographic Signing Reference

Single source of truth for all signing and verification operations in the QA
workflow. All subagents reference this document.

---

## Overview

The QA workflow uses HMAC-SHA256 signatures to ensure only authorized agents can
approve code for deployment. Each Phase 1 reviewer produces a typed signature,
review-lead aggregates and verifies them, then produces the final signature that
authorizes deployment.

---

## Signature Type Registry

Each agent uses a unique signature type. These are enforced by crypto-gate.

### Phase 1 Reviewers (6 signatures)

| Agent                       | Signature Type            |
| --------------------------- | ------------------------- |
| review-ci-tests-required    | `QA_CI_REQUIRED_TESTS`    |
| review-claims-auditor       | `QA_CLAIMS_AUDITOR`       |
| review-contracts-boundaries | `QA_CONTRACTS_BOUNDARIES` |
| review-mechanics-content    | `QA_MECHANICS_CONTENT`    |
| review-infra-concurrency    | `QA_INFRA_CONCURRENCY`    |
| review-tests-docs-dry       | `QA_TESTS_DOCS_DRY`       |

### Phase 2 Aggregator (1 signature)

| Agent       | Signature Type       |
| ----------- | -------------------- |
| review-lead | `QA_FINAL_SIGNATORY` |

---

## Signing (Phase 1 & 2)

### Script: `sign.sh`

Location: `.claude/agents/sub-agent/scripts/sign.sh`

**Usage:**

```bash
.claude/agents/sub-agent/scripts/sign.sh '<summary>' '<signature_type>'
```

**Arguments:**

- `summary`: Human-readable description of what was approved
- `signature_type`: One of the registered types above

**Output:**

JSON object with three fields:

```json
{
	"payload": "{\"commits\":[\"abc123\"],\"diffHash\":\"...\",\"verdict\":\"APPROVED\",\"summary\":\"...\",\"timestamp\":\"...\"}",
	"signature": "a1b2c3d4e5f6...",
	"type": "QA_CLAIMS_AUDITOR"
}
```

**What the script does:**

1. Gathers commit SHA and diff hash from git
2. Creates JSON payload with commits, verdict, summary, timestamp
3. Calls `crypto-gate sign` with the payload and type
4. Returns JSON with escaped payload, signature, and type

**Example:**

```bash
SIGN_OUTPUT=$(.claude/agents/sub-agent/scripts/sign.sh 'All 47 tests passed' 'QA_CI_REQUIRED_TESTS')
echo "$SIGN_OUTPUT"
# {"payload":"{\"commits\":[\"abc123\"],...}","signature":"a1b2c3...","type":"QA_CI_REQUIRED_TESTS"}
```

---

## Verification

### Bulk Verification: `verify-bulk.sh`

Location: `.claude/agents/sub-agent/scripts/verify-bulk.sh`

Used by: **review-lead** (Phase 2)

**Usage:**

```bash
.claude/agents/sub-agent/scripts/verify-bulk.sh '<approvals_json>' [expected_count]
```

**Arguments:**

- `approvals_json`: JSON array of approval objects
- `expected_count`: Number of approvals expected (default: 6)

**Input format:**

```json
[
	{ "payload": "...", "signature": "...", "type": "QA_CI_REQUIRED_TESTS" },
	{ "payload": "...", "signature": "...", "type": "QA_CLAIMS_AUDITOR" },
	...
]
```

**What the script does:**

1. Validates JSON structure and count
2. Calls `crypto-gate verify-bulk` to verify all signatures
3. Verifies HEAD commit is in at least one payload
4. Returns success/failure (does NOT push)

---

### Single Verification + Push: `verify-and-push.sh`

Location: `.claude/agents/sub-agent/scripts/verify-and-push.sh`

Used by: **safe-deployment-gate** (Phase 3)

**Usage:**

```bash
# Normal mode
.claude/agents/sub-agent/scripts/verify-and-push.sh '<payload>' '<signature>' [branch]

# Override mode
.claude/agents/sub-agent/scripts/verify-and-push.sh --override '<token>' [branch]
```

**What the script does:**

1. Calls `crypto-gate verify` to verify single signature
2. Validates payload verdict is APPROVED
3. Validates HEAD commit is in approved commits
4. Executes `git push -u origin <branch>`

---

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Parallel Signing (6 agents)                                            │
│                                                                                 │
│ review-ci-tests-required ──► sign.sh ──► QA_CI_REQUIRED_TESTS                   │
│ review-claims-auditor ─────► sign.sh ──► QA_CLAIMS_AUDITOR                      │
│ review-contracts-boundaries► sign.sh ──► QA_CONTRACTS_BOUNDARIES                │
│ review-mechanics-content ──► sign.sh ──► QA_MECHANICS_CONTENT                   │
│ review-infra-concurrency ──► sign.sh ──► QA_INFRA_CONCURRENCY                   │
│ review-tests-docs-dry ─────► sign.sh ──► QA_TESTS_DOCS_DRY                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Aggregation & Signing (1 agent)                                        │
│                                                                                 │
│ review-lead:                                                                    │
│   1. Receives 6 approvals from master-agent                                     │
│   2. Reads 6 JSON files to cross-check                                          │
│   3. Calls verify-bulk.sh to verify all 6 signatures                            │
│   4. If all pass: sign.sh ──► QA_FINAL_SIGNATORY                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Deployment (1 agent)                                                   │
│                                                                                 │
│ safe-deployment-gate:                                                           │
│   1. Receives single approval (QA_FINAL_SIGNATORY) from master-agent            │
│   2. Calls verify-and-push.sh                                                   │
│   3. If valid: git push                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Model

### Why Typed Signatures?

Each signature type is bound to a specific agent role. This ensures:

- A review-ci-tests-required approval cannot masquerade as a code review approval
- Only review-lead can produce the final deployment signature
- Signature types are verified by crypto-gate, not just the payload

### Why Bulk Verification?

Review-lead must verify all 6 Phase 1 signatures before signing. This ensures:

- No Phase 1 reviewer can be bypassed
- All reviewers approved the same commits
- The final signature represents unanimous approval

### Why Single Final Signature?

Safe-deployment-gate only accepts `QA_FINAL_SIGNATORY`. This ensures:

- The entire QA process completed (not just some reviewers)
- Review-lead's aggregation logic was applied
- A single point of accountability for deployment

---

## Troubleshooting

### "crypto-gate not found"

The crypto-gate binary should be downloaded by SubagentStart hook. If missing:

1. Check `$CLAUDE_PROJECT_DIR/bin/crypto-gate` exists
2. Check it's executable (`chmod +x`)
3. Report ERROR to master-agent if still missing

### "Invalid signature"

The signature verification failed. Causes:

- Payload was modified after signing
- Signature from different commit/branch
- Wrong signature type

**Fix:** Re-run the QA workflow to get fresh signatures.

### "HEAD not in commits"

New commits were added after QA approval. The signatures are stale.

**Fix:** Re-run Phase 1 and Phase 2 for current HEAD.

### "Expected 6 approvals, got N"

Not all Phase 1 reviewers completed or their approvals weren't collected.

**Fix:** Ensure master-agent collected all 6 approvals before dispatching review-lead.
