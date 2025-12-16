# Agent Intercommunication Protocols

This document defines the request and response formats for subagents used in
the QA and push workflow. It serves as the single source of truth for agent I/O specs.

**Referenced by:**

- `.claude/agents/sub-agent/docs/test-runner.md` - Test analysis agent
- `.claude/agents/sub-agent/docs/code-reviewer.md` - QA agent
- `.claude/agents/sub-agent/docs/pusher.md` - Push agent
- `.claude/agents/master-agent/docs/master-agent.md` - Main agent

---

## Test Runner Protocol

The test-runner subagent analyzes changes and executes appropriate tests.

### Request Format

Master-agent invokes via Task tool:

```
Analyze and test the changes in commit(s): <sha1>, <sha2>, ...

BRANCH: <branch-name>
FILES_CHANGED:
- <file1>
- <file2>
```

### Response Format

```
TEST_STATUS: PASS|FAIL|ERROR
STRATEGY: <strategy name>
TESTS_RUN: <number or "none">
FAILURES: [{"file": "...", "test": "...", "error": "..."}]
MESSAGE: <summary>
```

**Status meanings:**

- `PASS`: All tests passed (or no tests needed)
- `FAIL`: One or more tests failed
- `ERROR`: Test execution failed (system error)

---

## Code Reviewer Protocol

The code-reviewer subagent performs QA review before push.

### Request Format

Master-agent invokes via Task tool:

```
Review the changes on branch <branch-name>.

ORIGINAL REQUEST:
<The user's original request>

CHANGES MADE:
- <summary of implementation>

USER APPROVAL: <what the user explicitly approved, or "N/A">
```

### Response Format

```
===============================================================================
QA_RESPONSE_START
===============================================================================
VERDICT: APPROVED|BLOCKED|NEEDS_INPUT|ERROR
PAYLOAD: <json for APPROVED, empty otherwise>
SIGNATURE: <signature for APPROVED, empty otherwise>
MESSAGE:
<details>
===============================================================================
QA_RESPONSE_END
===============================================================================
```

**Verdict meanings:**

- `APPROVED`: Changes approved, proceed to push (includes payload + signature)
- `BLOCKED`: Violations found, must fix and retry
- `NEEDS_INPUT`: Unclear requirements, user must clarify
- `ERROR`: Signing failed, retry subagent

---

## Pusher Protocol

The pusher subagent verifies QA approval and executes the push.

### Request Format

Master-agent invokes via Task tool with ONE of two modes:

#### Mode 1: QA Approval (normal workflow)

```
Push the approved changes.

PAYLOAD: <json string from QA>
SIGNATURE: <hex string from QA>
BRANCH: <branch-name>
```

#### Mode 2: User Override (escape hatch)

```
User has authorized override push.

OVERRIDE_TOKEN: <user-provided-token>
BRANCH: <branch-name>
```

### Response Format

```
===============================================================================
PUSH_RESPONSE_START
===============================================================================
RESULT: SUCCESS|FAILED|ERROR
BRANCH: <branch-name or empty>
COMMIT: <commit-sha or empty>
MESSAGE: <details>
===============================================================================
PUSH_RESPONSE_END
===============================================================================
```

**Result meanings:**

- `SUCCESS`: Push completed successfully
- `FAILED`: Verification failed (invalid signature, HEAD mismatch)
- `ERROR`: System error (crypto-gate not found, etc.)

---

## Protocol Design Principles

1. **Structured parsing**: Responses use START/END markers for reliable extraction
2. **Consistent vocabulary**: Similar field names across protocols
3. **Single source of truth**: This document is referenced, not duplicated
