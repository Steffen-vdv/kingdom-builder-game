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

Where `{agent}` is the subagent identifier, e.g.:
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry
- code-reviewer
- verification-gate
- test-runner
- pusher

How to write the file (example):
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

- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry
- code-reviewer (final signatory)

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
"agent": "review-claims-auditor | review-contracts-boundaries | review-mechanics-content | review-infra-concurrency | review-tests-docs-dry | code-reviewer",
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
All types are REQUIRED for workflow continuation.

- review-claims-auditor        → QA_CLAIMS_AUDITOR
- review-contracts-boundaries  → QA_CONTRACTS_BOUNDARIES
- review-mechanics-content    → QA_MECHANICS_CONTENT
- review-infra-concurrency    → QA_INFRA_CONCURRENCY
- review-tests-docs-dry       → QA_TESTS_DOCS_DRY
- code-reviewer               → QA_FINAL_SIGNATORY

---

## verification-gate

Purpose:
- Verify all required QA signature types are present
- Verify all signatures against their payload+type
- Produce PASS / FAIL decision

### Input Schema

```json
{
  "branch": "branch-name",
  "commits": ["sha1", "sha2"],
  "required_signature_types": [
    "QA_CLAIMS_AUDITOR",
    "QA_CONTRACTS_BOUNDARIES",
    "QA_MECHANICS_CONTENT",
    "QA_INFRA_CONCURRENCY",
    "QA_TESTS_DOCS_DRY",
    "QA_FINAL_SIGNATORY"
  ],
  "qa_results": [
    {
      "agent": "review-claims-auditor",
      "signature_type": "QA_CLAIMS_AUDITOR",
      "payload": "string",
      "signature": "string"
    }
  ]
}
```

### Output Schema

```json
{
  "agent": "verification-gate",
  "status": "PASS | FAIL | ERROR",
  "summary": "Human-readable summary",
  "missing_signature_types": null,
  "invalid_signatures": null,
  "details": {}
}
```

Rules:
- PASS:
    - missing_signature_types == null
    - invalid_signatures == null
- FAIL:
    - missing_signature_types is non-empty if any missing
    - invalid_signatures is non-empty if any invalid
- ERROR:
    - system-level failure

Invalid signature entry shape:
```json
{
  "signature_type": "QA_...",
  "agent": "agent-name",
  "reason": "why verification failed"
}
```

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

```json
{
  "branch": "branch-name",
  "payload": "JSON string",
  "signature": "Hex string"
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

---

## Master-Agent Responsibilities

Master-agent MUST:
1. Dispatch subagents with pure JSON prompts
2. Read `{agent}.json` files after completion
3. Validate JSON before acting
4. Display hook-assembled output to the user

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