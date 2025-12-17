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

Where `{agent}` is one of: `test-runner`, `code-reviewer`, `pusher`

**File contents:** Pure JSON matching the agent's output schema (defined below).

**How to write:** Use the `Write` tool at the end of your session:

```
Write(file_path="/tmp/claude/sub-agents/output/test-runner.json", content="{...}")
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

## code-reviewer

### Input Schema

```json
{
	"branch": "branch-name",
	"commits": ["sha1"],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented",
	"user_approval": "What user explicitly approved, or null"
}
```

### Output Schema

```json
{
	"agent": "code-reviewer",
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
| `agent`     | `"code-reviewer"`                                           | Agent identifier (constant)             |
| `verdict`   | `"APPROVED"` \| `"BLOCKED"` \| `"NEEDS_INPUT"` \| `"ERROR"` | Review decision                         |
| `summary`   | string                                                      | Human-readable explanation              |
| `payload`   | string \| null                                              | Required if APPROVED, else null         |
| `signature` | string \| null                                              | Required if APPROVED, else null         |
| `blockers`  | `null` \| array of strings                                  | Required if BLOCKED, list of violations |

**Verdict meanings:**

- `APPROVED`: Code passes QA, includes valid payload+signature for pusher
- `BLOCKED`: Violations found, `blockers` array lists what must be fixed
- `NEEDS_INPUT`: Cannot decide without user clarification
- `ERROR`: System error (e.g., sign.sh failed)

---

## pusher

### Input Schema

```json
{
	"branch": "branch-name",
	"payload": "JSON string from code-reviewer",
	"signature": "Hex string from code-reviewer"
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
- `FAILED`: Verification failed (invalid signature, HEAD mismatch)
- `ERROR`: System error (network, permissions)

---

## Master-Agent Responsibilities

When dispatching subagents, master-agent MUST:

1. **Send pure JSON** — Prompt is ONLY the JSON object, no extra text
2. **Include all required fields** — Per agent's Input Schema above

When receiving subagent responses, master-agent MUST:

1. **Read the output file** at `/tmp/claude/sub-agents/output/{agent}-output.txt`
2. **Display contents verbatim** to user (Web UI transparency requirement)
3. **Parse the OUTPUT section** for programmatic decisions
4. **Act on structured data** — Use `verdict`/`status` fields, not prose

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
