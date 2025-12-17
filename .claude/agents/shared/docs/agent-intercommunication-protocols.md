# Agent Intercommunication Protocols

Single source of truth for all master↔subagent communication formats.

Injected into:

- master-agent (master-session-start.sh)
- all subagents (subagent-session-start.sh)

---

## Protocol Rules

1. Master-agent dispatches subagents with structured INPUT (pure JSON prompt)
2. Subagents write structured OUTPUT to a JSON file before completing
3. Post-hook validates JSON format; master-agent reads directly

IMPORTANT:

- Subagent chat output may be verbose and narrative
- Only the JSON output file is used for structured decisions

---

## Three-Phase Workflow Overview

```
Phase 1 (parallel):  6 reviewers → 6 signatures
Phase 2 (sequential): review-lead → 1 final signature
Phase 3 (sequential): safe-deployment-gate → push
```

---

## Input Format (master → subagent)

Master-agent prompt MUST be a pure JSON string — nothing else.

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"...": "agent-specific fields"
}
```

Notes:

- The backticks above are documentation-only
- The actual prompt contains raw JSON
- No markdown, no prefixes, no surrounding text

---

## Output Format (subagent → file)

Before completing, subagents MUST write structured output to a JSON file.

File path:

```text
/tmp/claude/sub-agents/output/{agent}.json
```

Where `{agent}` is the subagent identifier:

**Phase 1 Reviewers:**

- review-ci-tests-required
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry

**Phase 2 Aggregator:**

- review-lead

**Phase 3 Deployment:**

- safe-deployment-gate

How to write the file:

**USE THE HELPER SCRIPT:**

```bash
.claude/agents/sub-agent/scripts/write-output.sh '<agent-name>' '<json-content>'
```

Example:

```bash
.claude/agents/sub-agent/scripts/write-output.sh 'review-lead' '{"agent":"review-lead","verdict":"APPROVED",...}'
```

The script handles directory creation and overwrites any existing file.

**Why use the script (not Write tool or bash)?**

- Ensures correct path `/tmp/claude/sub-agents/output/{agent}.json`
- Creates directory if missing
- Validates arguments
- Consistent across all agents

Rules:

- Chat output may be free-form
- Only the JSON file is parsed by hooks
- Missing or invalid JSON causes downstream failure

---

## Phase 1 Reviewers (6-Agent Family)

All Phase 1 reviewers share the SAME input schema and the SAME output schema.

### Phase 1 Agent Identifiers

- review-ci-tests-required (CI/test runner)
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry

---

## Phase 1 Input Schema (shared by all 6 Phase 1 agents)

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented",
	"user_approval": "What user explicitly approved, or null",
	"files_changed": ["path/to/file1.ts", "path/to/file2.ts"]
}
```

Rules:

- `files_changed` is REQUIRED
- Agents may ignore fields but must not require additional ones

**Exception:** review-ci-tests-required only requires `branch`, `commits`, and
`files_changed`. Other fields are optional for it.

---

## Phase 1 Output Schema (shared by all 6 Phase 1 agents)

Each Phase 1 agent MUST write the following structure to `{agent}.json`:

```json
{
	"agent": "review-ci-tests-required | review-claims-auditor | review-contracts-boundaries | review-mechanics-content | review-infra-concurrency | review-tests-docs-dry",
	"verdict": "APPROVED | BLOCKED | NEEDS_INPUT | ERROR",
	"summary": "Human-readable summary",

	"signature_type": null,
	"payload": null,
	"signature": null,

	"blockers": null,
	"questions": null,
	"details": {}
}
```

### Field Requirements

- `agent`: constant identifier for the agent
- `verdict`: required
- `summary`: required

Signing rules:

- If verdict == APPROVED:
  - `signature_type` MUST be a non-empty string
  - `payload` MUST be a non-empty string
  - `signature` MUST be a non-empty string
- Otherwise:
  - `signature_type`, `payload`, `signature` MUST be null

BLOCKED rules:

- verdict == BLOCKED → `blockers` MUST be a non-empty array
- otherwise `blockers` MUST be null

NEEDS_INPUT rules:

- verdict == NEEDS_INPUT → `questions` MUST be a non-empty array
- otherwise `questions` MUST be null

`details`:

- Always present
- Agent-specific structured metadata goes here
  (risk tier, files examined, systems touched, etc.)

---

## Signature Type Registry

### Phase 1 (6 signatures required for Phase 2)

| Agent                       | Signature Type            |
| --------------------------- | ------------------------- |
| review-ci-tests-required    | `QA_CI_REQUIRED_TESTS`    |
| review-claims-auditor       | `QA_CLAIMS_AUDITOR`       |
| review-contracts-boundaries | `QA_CONTRACTS_BOUNDARIES` |
| review-mechanics-content    | `QA_MECHANICS_CONTENT`    |
| review-infra-concurrency    | `QA_INFRA_CONCURRENCY`    |
| review-tests-docs-dry       | `QA_TESTS_DOCS_DRY`       |

### Phase 2 (1 signature required for Phase 3)

| Agent       | Signature Type       |
| ----------- | -------------------- |
| review-lead | `QA_FINAL_SIGNATORY` |

For signing/verification details, see:
`.claude/agents/sub-agent/docs/cryptographic-signing.md`

---

## review-lead (Phase 2)

### Input Schema

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"approvals_json": [
		{ "payload": "...", "signature": "...", "type": "QA_CI_REQUIRED_TESTS" },
		{ "payload": "...", "signature": "...", "type": "QA_CLAIMS_AUDITOR" },
		{ "payload": "...", "signature": "...", "type": "QA_CONTRACTS_BOUNDARIES" },
		{ "payload": "...", "signature": "...", "type": "QA_MECHANICS_CONTENT" },
		{ "payload": "...", "signature": "...", "type": "QA_INFRA_CONCURRENCY" },
		{ "payload": "...", "signature": "...", "type": "QA_TESTS_DOCS_DRY" }
	],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented"
}
```

The `approvals_json` array must contain exactly 6 objects (one per Phase 1
reviewer). Review-lead verifies all 6 signatures before producing its own.

### Output Schema

Same as Phase 1 Output Schema, with:

- `agent`: "review-lead"
- `signature_type`: "QA_FINAL_SIGNATORY" (when APPROVED)

---

## safe-deployment-gate (Phase 3)

### Input Schema

**Mode 1: QA Approval (normal workflow)**

```json
{
	"branch": "branch-name",
	"approval": {
		"payload": "...",
		"signature": "...",
		"type": "QA_FINAL_SIGNATORY"
	}
}
```

The `approval` object contains the single signature from review-lead.
Only `QA_FINAL_SIGNATORY` type is accepted.

**Mode 2: User Override (escape hatch)**

```json
{
	"branch": "branch-name",
	"override_token": "token-from-user"
}
```

### Output Schema

```json
{
	"agent": "safe-deployment-gate",
	"status": "SUCCESS | FAILED | ERROR",
	"branch": "branch-name",
	"commit": "sha-or-null",
	"message": "Human-readable result"
}
```

Status meanings:

- SUCCESS: Push completed, `commit` contains the pushed SHA
- FAILED: Verification failed (invalid signature, HEAD mismatch)
- ERROR: System error (network, permissions)

---

## Master-Agent Responsibilities

The three-phase workflow requires master-agent to:

### Phase 1

1. Dispatch all 6 Phase 1 reviewers in parallel (single message with 6 Task calls)
2. Wait for all to complete
3. Collect 6 approvals (payload, signature, type) from each

### Phase 2

4. Dispatch review-lead with the 6 approvals in `approvals_json`
5. Wait for completion
6. Read `/tmp/claude/sub-agents/output/review-lead.json`
7. Display JSON contents verbatim to user (CRUCIAL)
8. Extract review-lead's approval (payload, signature, type)

### Phase 3

9. Dispatch safe-deployment-gate with review-lead's single approval
10. Report result to user

---

## Validation & Error Handling

### Pre-hook (task-pre.sh)

Blocks execution if:

- Input is not valid JSON
- Required fields are missing

### Post-hook (task-post.sh)

Validates JSON output file exists and is valid. Cannot block execution.

Emits warnings to stderr if:

- Output file does not exist
- Output file is not valid JSON

Master-agent reads the JSON file directly for structured data.

---

## Subagent Final Step: Remind Master-Agent

**Only review-lead (Phase 2) includes this reminder block.**

Phase 1 agents do not need it because master-agent only displays review-lead's
output (which aggregates all Phase 1 verdicts).

Review-lead MUST end its chat response with:

```
═══════════════════════════════════════════════════════════════════════════════
MASTER-AGENT: READ THIS
═══════════════════════════════════════════════════════════════════════════════
You MUST now:
1. Read: /tmp/claude/sub-agents/output/review-lead.json
2. Output the COMPLETE JSON verbatim to the user

The user is in Web UI and cannot see subagent outputs.
If you do not show them, they are blind.
═══════════════════════════════════════════════════════════════════════════════
```

This goes at the VERY END of review-lead's chat response, after all analysis.
