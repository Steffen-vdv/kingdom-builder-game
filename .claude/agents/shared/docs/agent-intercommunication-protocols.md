# Agent Intercommunication Protocols

Single source of truth for all master↔subagent communication formats.

**Injected into:** master-agent (master-session-start.sh), all subagents (subagent-session-start.sh)

---

## Protocol Rules

1. **Master-agent** dispatches subagents with structured INPUT (pure JSON prompt)
2. **Subagents** write structured OUTPUT to a JSON file before completing
3. **Hooks** validate JSON and assemble the final output file for master-agent

---

## Input Format (master → subagent)

Master-agent prompt MUST be a **pure JSON string** — nothing else:

```json
{
  "branch": "branch-name",
  "commits": ["sha1", "sha2"],
  ...agent-specific fields...
}
```

**NOTE:** The backticks above are for documentation readability only. The actual
prompt contains raw JSON with no markdown fences, no "INPUT:" prefix, no extra text.

---

## Output Format (subagent → file)

Before completing, subagents MUST write their structured output to a JSON file:

**File path:** `/tmp/claude/sub-agents/output/{agent}.json`

Where `{agent}` is one of:

- `test-runner`
- `review-lead`
- `review-claims-auditor`
- `review-contracts-boundaries`
- `review-mechanics-content`
- `review-infra-concurrency`
- `review-tests-docs-dry`
- `pusher`

**File contents:** Pure JSON matching the agent's output schema (defined below).

**How to write:** Use the `Write` tool at the end of your session:

```
Write(file_path="/tmp/claude/sub-agents/output/review-lead.json", content="{...}")
```

The hook system reads this file, validates it, and assembles the final output
for master-agent. Your chat output can be free-form narrative — only the JSON
file matters for structured data exchange.

---

## test-runner

### Input Schema

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"files_changed": ["path/to/file1.ts", "path/to/file2.ts"]
}
```

### Output Schema

```json
{
	"agent": "test-runner",
	"status": "PASS | FAIL | ERROR",
	"strategy": "full-suite | targeted | no-tests",
	"summary": "Human-readable summary of what was tested",
	"tests_run": 0,
	"failures": null
}
```

**Fields:**

| Field       | Type                                           | Description                             |
| ----------- | ---------------------------------------------- | --------------------------------------- |
| `agent`     | `"test-runner"`                                | Agent identifier (constant)             |
| `status`    | `"PASS"` \| `"FAIL"` \| `"ERROR"`              | Overall result                          |
| `strategy`  | `"full-suite"` \| `"targeted"` \| `"no-tests"` | Test strategy applied                   |
| `summary`   | string                                         | Human-readable explanation              |
| `tests_run` | number                                         | Count of tests executed                 |
| `failures`  | `null` \| array                                | Null if PASS, array of failures if FAIL |

**Failure object:**

```json
{
	"test": "path/to/test.ts::testName",
	"error": "Error message"
}
```

---

## Reviewers (Shared Schema)

All 6 reviewers use the same input/output schema. They differ only in their
review focus (defined in their respective `.md` files).

**Reviewers:**

| Agent                         | Output File                        |
| ----------------------------- | ---------------------------------- |
| `review-lead`                 | `review-lead.json`                 |
| `review-claims-auditor`       | `review-claims-auditor.json`       |
| `review-contracts-boundaries` | `review-contracts-boundaries.json` |
| `review-mechanics-content`    | `review-mechanics-content.json`    |
| `review-infra-concurrency`    | `review-infra-concurrency.json`    |
| `review-tests-docs-dry`       | `review-tests-docs-dry.json`       |

### Input Schema (all reviewers)

```json
{
	"branch": "branch-name",
	"commits": ["sha1"],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented",
	"user_approval": "What user explicitly approved, or null"
}
```

### Output Schema (all reviewers)

```json
{
	"agent": "review-lead | review-claims-auditor | ...",
	"verdict": "APPROVED | BLOCKED | NEEDS_INPUT | ERROR",
	"summary": "Human-readable summary of the review",
	"payload": "JSON string from sign.sh, or null",
	"signature": "Hex string from sign.sh, or null",
	"blockers": null
}
```

**Fields:**

| Field       | Type                                                        | Description                             |
| ----------- | ----------------------------------------------------------- | --------------------------------------- |
| `agent`     | reviewer name                                               | Agent identifier (must match file name) |
| `verdict`   | `"APPROVED"` \| `"BLOCKED"` \| `"NEEDS_INPUT"` \| `"ERROR"` | Review decision                         |
| `summary`   | string                                                      | Human-readable explanation              |
| `payload`   | string \| null                                              | Required if APPROVED, else null         |
| `signature` | string \| null                                              | Required if APPROVED, else null         |
| `blockers`  | `null` \| array of strings                                  | Required if BLOCKED, list of violations |

**Verdict meanings:**

- `APPROVED`: Code passes this reviewer's criteria, includes valid payload+signature
- `BLOCKED`: Violations found, `blockers` array lists what must be fixed
- `NEEDS_INPUT`: Cannot decide without user clarification
- `ERROR`: System error (e.g., sign.sh failed)

**Push requirement:** ALL 6 reviewers must return `APPROVED` with valid signatures.

---

## pusher

### Input Schema

**Mode 1: Bulk QA Approval (normal workflow)**

```json
{
	"branch": "branch-name",
	"approvals": [
		{ "payload": "...", "signature": "..." },
		{ "payload": "...", "signature": "..." },
		{ "payload": "...", "signature": "..." },
		{ "payload": "...", "signature": "..." },
		{ "payload": "...", "signature": "..." },
		{ "payload": "...", "signature": "..." }
	]
}
```

The `approvals` array must contain exactly 6 objects (one per reviewer).
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
	"commit": "sha or null",
	"message": "Human-readable result message"
}
```

**Fields:**

| Field     | Type                                   | Description                      |
| --------- | -------------------------------------- | -------------------------------- |
| `agent`   | `"pusher"`                             | Agent identifier (constant)      |
| `status`  | `"SUCCESS"` \| `"FAILED"` \| `"ERROR"` | Push result                      |
| `branch`  | string                                 | Branch that was pushed           |
| `commit`  | string \| null                         | Commit SHA if SUCCESS, else null |
| `message` | string                                 | Human-readable explanation       |

**Status meanings:**

- `SUCCESS`: Push completed, `commit` contains the pushed SHA
- `FAILED`: Verification failed (invalid signature, HEAD mismatch, missing approvals)
- `ERROR`: System error (network, permissions)

---

## Master-Agent Responsibilities

When dispatching subagents, master-agent MUST:

1. **Send pure JSON** — Prompt is ONLY the JSON object, no extra text
2. **Include all required fields** — Per agent's Input Schema above
3. **Dispatch all 6 reviewers + test-runner in parallel** — Single message with 7 Task calls

When receiving subagent responses, master-agent MUST:

1. **Read the output file** at `/tmp/claude/sub-agents/output/{agent}-output.txt`
2. **Display contents verbatim** to user — no truncation, no `...`, no summaries
3. **Parse the OUTPUT section** for programmatic decisions
4. **Act on structured data** — Use `verdict`/`status` fields, not prose
5. **Collect all 6 signatures** before dispatching pusher

---

## Validation & Error Handling

Hooks enforce JSON validity at every layer.

### Pre-hook Validation (task-pre.sh)

**Blocks** dispatch if INPUT is invalid:

- Prompt is not valid JSON → BLOCKED
- Missing required fields (branch, etc.) → BLOCKED

Master-agent sees the block reason and can fix the INPUT before retrying.

### Post-hook Validation (task-post.sh)

**Cannot block** (subagent already finished), but signals errors to master-agent.

Validation steps:

1. Read `{agent}.json` file written by subagent
2. Parse contents as JSON → fail if invalid or missing
3. Assemble final `-output.txt` with markdown template

On any failure, outputs error to the OUTPUT section:

```json
{
	"error": "description of what failed",
	"agent": "agent-name",
	"action": "RETRY",
	"expected_file": "/tmp/claude/sub-agents/output/{agent}.json"
}
```
