# Agent Intercommunication Protocols

Single source of truth for all master↔subagent communication formats.

Injected into:

- master-agent (master-session-start.sh)
- all subagents (subagent-session-start.sh)

---

## Protocol Rules

1. Master-agent dispatches subagents with structured INPUT (pure JSON prompt)
2. Subagents write structured OUTPUT to a JSON file before completing
3. Hooks validate JSON and assemble the final output for master-agent

IMPORTANT:

- Subagent chat output may be verbose and narrative
- Only the JSON output file is used for structured decisions

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

- review-lead
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry
- test-runner
- pusher

How to write the file:

**Option 1: Use the helper script (recommended)**

```bash
write-output.sh '<agent-name>' '<json-content>'
```

Example:

```bash
write-output.sh 'review-lead' '{"agent":"review-lead","verdict":"APPROVED",...}'
```

The script handles directory creation and overwrites any existing file.

**Option 2: Use the Write tool directly**

```text
Write(
  file_path="/tmp/claude/sub-agents/output/{agent}.json",
  content="{...pure json...}"
)
```

Rules:

- Chat output may be free-form
- Only the JSON file is parsed by hooks
- Missing or invalid JSON causes downstream failure

---

## QA Reviewers (6-Agent Family)

All QA reviewers share the SAME input schema and the SAME output schema.

### QA Agent Identifiers

- review-lead (final signatory)
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry

---

## QA Input Schema (shared by all 6 QA agents)

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

---

## QA Output Schema (shared by all 6 QA agents)

Each QA agent MUST write the following structure to `{agent}.json`:

```json
{
	"agent": "review-lead | review-claims-auditor | review-contracts-boundaries | review-mechanics-content | review-infra-concurrency | review-tests-docs-dry",
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

## QA Signature Type Registry (required set)

Each QA agent MUST sign with a unique signature type.
All 6 types are REQUIRED for workflow continuation (bulk verification).

- review-lead → QA_FINAL_SIGNATORY
- review-claims-auditor → QA_CLAIMS_AUDITOR
- review-contracts-boundaries → QA_CONTRACTS_BOUNDARIES
- review-mechanics-content → QA_MECHANICS_CONTENT
- review-infra-concurrency → QA_INFRA_CONCURRENCY
- review-tests-docs-dry → QA_TESTS_DOCS_DRY

---

## test-runner

### Input Schema

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"files_changed": ["path/to/file1.ts"]
}
```

### Output Schema

```json
{
	"agent": "test-runner",
	"status": "PASS | FAIL | ERROR",
	"strategy": "full-suite | targeted | no-tests",
	"summary": "Human-readable summary",
	"tests_run": 0,
	"failures": null
}
```

Failure entry shape:

```json
{
	"test": "path/to/test.ts::testName",
	"error": "Error message"
}
```

---

## pusher

### Input Schema

**Mode 1: Bulk QA Approval (normal workflow)**

```json
{
	"branch": "branch-name",
	"approvals": [
		{ "payload": "...", "signature": "...", "type": "QA_FINAL_SIGNATORY" },
		{ "payload": "...", "signature": "...", "type": "QA_CLAIMS_AUDITOR" },
		{ "payload": "...", "signature": "...", "type": "QA_CONTRACTS_BOUNDARIES" },
		{ "payload": "...", "signature": "...", "type": "QA_MECHANICS_CONTENT" },
		{ "payload": "...", "signature": "...", "type": "QA_INFRA_CONCURRENCY" },
		{ "payload": "...", "signature": "...", "type": "QA_TESTS_DOCS_DRY" }
	]
}
```

The `approvals` array must contain exactly 6 objects (one per reviewer).
Each object includes `payload`, `signature`, and `type` (signature type).
Pusher uses `crypto-gate verify-bulk` to verify all signatures in one call.

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
	"agent": "pusher",
	"status": "SUCCESS | FAILED | ERROR",
	"branch": "branch-name",
	"commit": "sha-or-null",
	"message": "Human-readable result"
}
```

Status meanings:

- SUCCESS: Push completed, `commit` contains the pushed SHA
- FAILED: Verification failed (invalid signature, HEAD mismatch, missing approvals)
- ERROR: System error (network, permissions)

---

## Master-Agent Responsibilities

Master-agent MUST:

1. Dispatch all 6 reviewers + test-runner in parallel (single message with 7 Task calls)
2. Read `{agent}-output.txt` files after completion
3. Display contents verbatim to user
4. Collect all 6 signatures before dispatching pusher
5. Pass approvals array to pusher for bulk verification

---

## Validation & Error Handling

### Pre-hook (task-pre.sh)

Blocks execution if:

- Input is not valid JSON
- Required fields are missing

### Post-hook (task-post.sh)

Cannot block execution, but reports failures.

On failure, hooks emit error JSON:

```json
{
	"error": "description",
	"agent": "agent-name",
	"action": "RETRY",
	"expected_file": "/tmp/claude/sub-agents/output/{agent}.json"
}
```
