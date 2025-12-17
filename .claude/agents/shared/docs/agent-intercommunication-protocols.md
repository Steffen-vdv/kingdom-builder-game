# Agent Intercommunication Protocols

Single source of truth for all master↔subagent communication formats.

**Injected into:** master-agent (mss.sh), all subagents (sss.sh)

---

## Protocol Rules

1. **Master-agent** dispatches subagents with structured INPUT (JSON in prompt)
2. **Subagents** respond with the **exact structure** defined below
3. **Hooks** validate format compliance and warn on malformed messages

---

## Response Structure (MANDATORY)

Every subagent response MUST follow this exact structure:

````
═══════════════════════════════════════════════════════════════════════════════
MASTER-AGENT: READ THIS FIRST
═══════════════════════════════════════════════════════════════════════════════
Before acting on this response, you MUST:
1. Find the system-reminder for {agent}-output.txt in your current context
2. Output those contents verbatim to the user
3. THEN parse the ---RESPONSE--- JSON below for programmatic action

This is a MANDATORY step for Web UI transparency.
═══════════════════════════════════════════════════════════════════════════════

---NARRATIVE---

[Your verbose analysis, reasoning, investigation steps go here]

---RESPONSE---
```json
{ ... structured JSON output ... }
```
````

**Structure breakdown:**

| Section                         | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `MASTER-AGENT: READ THIS FIRST` | In-the-moment reminder to display output before acting         |
| `---NARRATIVE---`               | Human-readable analysis (optional delimiter, content required) |
| `---RESPONSE---`                | Formal JSON for programmatic parsing                           |

---

## test-runner

### Input (master → subagent)

Master-agent MUST provide this context in the Task prompt:

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"files_changed": ["path/to/file1.ts", "path/to/file2.ts"]
}
```

### Output (subagent → master)

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

### Input (master → subagent)

Master-agent MUST provide this context in the Task prompt:

```json
{
	"branch": "branch-name",
	"commits": ["sha1"],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented",
	"user_approval": "What user explicitly approved, or null"
}
```

### Output (subagent → master)

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

### Input (master → subagent)

Master-agent MUST provide this context in the Task prompt:

```json
{
	"branch": "branch-name",
	"payload": "JSON string from code-reviewer",
	"signature": "Hex string from code-reviewer"
}
```

### Output (subagent → master)

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

1. **Provide complete INPUT** — All required fields in JSON format
2. **Parse OUTPUT JSON** — Extract the block after `---RESPONSE---`
3. **Act on structured data** — Use `verdict`/`status` fields, not prose
4. **Display to user** — Show narrative + structured result for transparency

When receiving subagent responses, master-agent MUST:

1. **Read the output file** at `.claude/hooks/output/{agent}-output.txt`
2. **Display contents verbatim** to user (Web UI transparency requirement)
3. **Parse the JSON block** after `---RESPONSE---` for programmatic decisions

---

## Validation & Error Handling

Hooks enforce format compliance with blocking and retry mechanisms.

### Pre-hook Validation (task-pre.sh)

**Blocks** dispatch if INPUT is malformed:

- Missing ````json` block in prompt → BLOCKED
- Missing required fields (branch, etc.) → BLOCKED

Master-agent sees the block reason and can fix the INPUT before retrying.

### Post-hook Validation (task-post.sh)

**Cannot block** (subagent already finished), but signals errors to master-agent.

When `---RESPONSE---` delimiter is missing, outputs:

```
---SUBAGENT_FORMAT_ERROR---
{
  "agent": "<agent-name>",
  "error": "Response missing ---RESPONSE--- delimiter",
  "action": "RETRY",
  "instruction": "Re-dispatch with format reminder"
}
---END_FORMAT_ERROR---
```