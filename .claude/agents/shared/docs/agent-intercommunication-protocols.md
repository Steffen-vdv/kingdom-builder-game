# Agent Intercommunication Protocols

Single source of truth for all master↔subagent communication formats.

**Injected into:** master-agent (mss.sh), all subagents (sss.sh)

---

## Protocol Rules

1. **Master-agent** dispatches subagents with structured INPUT (pure JSON string)
2. **Subagents** respond with structured OUTPUT (pure JSON string)
3. **Hooks** validate JSON and reject malformed messages

**IMPORTANT:** All communication is valid, parseable JSON. No markdown, no delimiters,
no extra text. Hooks use `jq` to parse — invalid JSON = immediate failure.

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

## Output Format (subagent → master)

Every subagent response MUST be a **pure JSON string** with this exact schema:

```json
{
  "master-agent-system-instructions": [
    "MASTER-AGENT: READ THIS FIRST",
    "Before acting on this response, you MUST:",
    "1. Read output file at /tmp/claude/sub-agents/output/{agent}-output.txt",
    "2. Output those contents VERBATIM to the user (Web UI transparency)",
    "3. THEN parse response-formal-json for programmatic action",
    "MANDATORY: Do not skip these steps. User cannot see subagent output directly."
  ],
  "response-verbose": "Your narrative analysis here. Markdown allowed inside this string.",
  "response-formal-json": { ...agent-specific schema... }
}
```

**NOTE:** The backticks above are for documentation readability only. The actual
response is raw JSON with no markdown fences.

**CRITICAL RULES:**

1. Response MUST be valid JSON (parseable by `jq`)
2. Response MUST contain all three top-level fields
3. `response-verbose` may contain any text (properly JSON-escaped)
4. `response-formal-json` schema is defined per agent below
5. **Output ONLY the JSON object** — no preamble, no trailing text

### ❌ WRONG Output Examples

**WRONG — Markdown with embedded JSON:**

````
## Analysis Complete

I analyzed the changes and found no issues.

```json
{"response-formal-json": {...}}
````

```

**WRONG — Explanatory preamble:**
```

Here is my analysis of the code changes:

{"master-agent-system-instructions": [...], ...}

```

**WRONG — Trailing commentary:**
```

{"master-agent-system-instructions": [...], ...}

Let me know if you need anything else!

```

### ✅ RIGHT Output Example

Your response must look EXACTLY like this (one JSON object, nothing else):
```

{"master-agent-system-instructions":["MASTER-AGENT: READ THIS FIRST","..."],"response-verbose":"I analyzed commit abc123. The changes affect...","response-formal-json":{"agent":"test-runner","status":"PASS","strategy":"no-tests","summary":"Infrastructure only","tests_run":0,"failures":null}}

````

The first character is `{`. The last character is `}`. Nothing before. Nothing after.

---

## test-runner

### Input Schema

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"files_changed": ["path/to/file1.ts", "path/to/file2.ts"]
}
````

### Output Schema (`response-formal-json`)

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

### Output Schema (`response-formal-json`)

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

### Output Schema (`response-formal-json`)

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

1. **FIRST: Follow `master-agent-system-instructions`** — These are critical directives
2. **Read the output file** at `/tmp/claude/sub-agents/output/{agent}-output.txt`
3. **Display contents verbatim** to user (Web UI transparency requirement)
4. **THEN: Parse `response-formal-json`** for programmatic decisions
5. **Act on structured data** — Use `verdict`/`status` fields, not prose

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

1. Parse response as JSON → fail if invalid
2. Extract `response-formal-json` → fail if missing
3. Validate `response-formal-json` is object → fail if not

On any failure, outputs error to file:

```json
{
	"error": "description of what failed",
	"agent": "agent-name",
	"action": "RETRY",
	"instruction": "Re-dispatch subagent with format reminder"
}
```

---

## ⚠️ FINAL REMINDER: OUTPUT FORMAT

**Before you respond, verify:**

- [ ] First character of response is `{`
- [ ] Last character of response is `}`
- [ ] No markdown anywhere in response
- [ ] No explanatory text before or after JSON
- [ ] No code fences (```)
- [ ] Response is parseable by `jq`

**Your narrative goes INSIDE `response-verbose`, not outside the JSON.**

If you output markdown, the hooks WILL fail and you WILL be re-dispatched.
