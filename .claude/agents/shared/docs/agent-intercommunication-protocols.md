# Agent Intercommunication Protocols

This document defines the request and response formats for all subagents used in
the push workflow. It serves as the single source of truth for agent I/O specs.

**Referenced by:**

- `.claude/agents/sub-agent/docs/coder.md` - Implementation agent definition
- `.claude/agents/sub-agent/docs/test-runner.md` - Test analysis agent definition
- `.claude/agents/sub-agent/docs/code-reviewer.md` - QA agent definition
- `.claude/agents/sub-agent/docs/pusher.md` - Pusher agent definition
- `.claude/agents/hypervisor/docs/hypervisor.md` - Hypervisor orchestration guide
- `.claude/agents/hypervisor/docs/agent-task-workflow.md` - Detailed workflow procedures

---

## Coder Protocol

The coder subagent implements features, fixes bugs, and addresses concerns.

### Request Format

Hypervisor invokes via Task tool with this prompt structure:

```
TASK: <Clear description of what to implement>

CONTEXT:
- Relevant files: <files the coder should read first>
- Related systems: <what this integrates with>
- Constraints: <specific requirements or limitations>

ACCEPTANCE CRITERIA:
- <Criterion 1>
- <Criterion 2>

SCOPE BOUNDARIES:
- DO: <what is in scope>
- DO NOT: <what is explicitly out of scope>
```

### Response Format

Coder returns a structured response:

```
═══════════════════════════════════════════════════════════════════════════════
CODER_RESPONSE_START
═══════════════════════════════════════════════════════════════════════════════
STATUS: SUCCESS|BLOCKED|ERROR
COMMITS: ["<sha1>", "<sha2>", ...]
MESSAGE:
<Summary of implementation or explanation of blocker>
═══════════════════════════════════════════════════════════════════════════════
CODER_RESPONSE_END
═══════════════════════════════════════════════════════════════════════════════
```

**Field descriptions:**

- **STATUS**: Outcome (SUCCESS/BLOCKED/ERROR)
- **COMMITS**: Array of commit SHAs created (empty if BLOCKED/ERROR)
- **MESSAGE**: Human-readable summary or blocker explanation

**Status meanings:**

- `SUCCESS`: Implementation complete, commits created
- `BLOCKED`: Cannot proceed, needs clarification or guidance
- `ERROR`: System failure during implementation

---

## Test Runner Protocol

The test-runner subagent analyzes changes and executes appropriate tests.

### Request Format

Hypervisor invokes via Task tool with this prompt structure:

```
Analyze and test the changes in commit(s): <sha1>, <sha2>, ...

BRANCH: <branch-name>
SCOPE: <targeted | full | verify>
```

**Scope options:**

- `targeted`: Analyze changes and run only relevant tests
- `full`: Run full test suite (pnpm test:parallel)
- `verify`: Run complete verification (pnpm verify)

### Response Format

Test-runner returns a structured response:

```
═══════════════════════════════════════════════════════════════════════════════
TEST_RESPONSE_START
═══════════════════════════════════════════════════════════════════════════════
STATUS: PASS|FAIL|ERROR
STRATEGY: <strategy name>
TESTS_RUN: <number or "none">
FAILURES: [{"file": "...", "test": "...", "error": "..."}]
MESSAGE:
<Strategy rationale and summary>
═══════════════════════════════════════════════════════════════════════════════
TEST_RESPONSE_END
═══════════════════════════════════════════════════════════════════════════════
```

**Field descriptions:**

- **STATUS**: Test outcome (PASS/FAIL/ERROR)
- **STRATEGY**: Which test strategy was chosen and why
- **TESTS_RUN**: Number of tests executed, or "none" if no tests needed
- **FAILURES**: Array of failure objects (empty if PASS)
- **MESSAGE**: Human-readable summary of test run

**Status meanings:**

- `PASS`: All tests passed (or no tests needed)
- `FAIL`: One or more tests failed
- `ERROR`: Test execution failed (system error)

---

## Code Reviewer Protocol

The code-reviewer subagent performs adversarial QA review before push.

### Request Format

Hypervisor invokes via Task tool with this prompt structure:

```
Review the changes on branch <branch-name>.

ORIGINAL REQUEST:
<The user's original request that led to these changes>

TASK AGENT CLAIMS:
- Solution: <What was implemented and why>
- Layer: <content | engine | web | server | docs>
- Tests: <Test coverage details, or "N/A" for non-code changes>
- User approval: <What the user explicitly approved, or "N/A">

SPECIFIC QA FOCUS (optional):
<Any specific aspects to pay attention to>
```

**Field descriptions:**

- **ORIGINAL REQUEST**: The user's original request/requirements. This gives QA
  context about intent, not just implementation.
- **Solution**: What was implemented. For bugs, explain the fix. For features,
  explain what was added. For refactoring, explain the improvement.
- **Layer**: Which architectural layer owns the change
- **Tests**: Test coverage or "N/A" if not applicable
- **User approval**: What the user explicitly approved, or "N/A"
- **SPECIFIC QA FOCUS**: Optional additional guidance for QA

### Response Format

QA agent returns a structured response:

```
═══════════════════════════════════════════════════════════════════════════════
QA_RESPONSE_START
═══════════════════════════════════════════════════════════════════════════════
VERDICT: APPROVED|BLOCKED|NEEDS_INPUT|ERROR
PAYLOAD: <json for APPROVED, empty otherwise>
SIGNATURE: <signature for APPROVED, empty otherwise>
MESSAGE:
<Multi-line details - use line breaks and numbered lists for readability>
═══════════════════════════════════════════════════════════════════════════════
QA_RESPONSE_END
═══════════════════════════════════════════════════════════════════════════════
```

**Field descriptions:**

- **VERDICT**: Review outcome (APPROVED/BLOCKED/NEEDS_INPUT/ERROR)
- **PAYLOAD**: JSON string for APPROVED (contains commit list, diff hash, etc.),
  empty otherwise
- **SIGNATURE**: Cryptographic signature for APPROVED, empty otherwise
- **MESSAGE**: Human-readable details (violations, questions, approval summary)

**Verdict meanings:**

- `APPROVED`: Changes are approved, proceed to push
- `BLOCKED`: Violations found, must fix and retry
- `NEEDS_INPUT`: Unclear requirements, user must clarify
- `ERROR`: Signing failed, retry subagent invocation

---

## Pusher Protocol

The pusher subagent verifies QA approval and executes the push.

### Request Format

Hypervisor invokes via Task tool with ONE of two modes:

#### Mode 1: QA Approval (normal workflow)

```
Push the approved changes.

PAYLOAD:
<json string from QA - do not modify>

SIGNATURE:
<hex string from QA - do not modify>
```

#### Mode 2: User Override (escape hatch)

```
User has authorized override push.

OVERRIDE_TOKEN: <user-provided-token>
BRANCH: <branch-name>
```

### Response Format

Pusher agent returns a structured response:

```
═══════════════════════════════════════════════════════════════════════════════
PUSH_RESPONSE_START
═══════════════════════════════════════════════════════════════════════════════
RESULT: SUCCESS|FAILED|ERROR
BRANCH: <branch-name or empty>
COMMIT: <commit-sha or empty>
MESSAGE:
<Human-readable details - use line breaks and numbered lists for readability>
═══════════════════════════════════════════════════════════════════════════════
PUSH_RESPONSE_END
═══════════════════════════════════════════════════════════════════════════════
```

**Field descriptions:**

- **RESULT**: Push outcome (SUCCESS/FAILED/ERROR)
- **BRANCH**: Branch name on success, empty on failure
- **COMMIT**: Commit SHA on success, empty on failure
- **MESSAGE**: Human-readable details (success confirmation, error details)

**Result meanings:**

- `SUCCESS`: Push completed successfully
- `FAILED`: Verification or push failed (invalid signature, HEAD mismatch, etc.)
- `ERROR`: Script or system error (crypto-gate not found, execution failed, etc.)

---

## Protocol Design Principles

1. **Structured parsing**: All responses use START/END markers for reliable
   extraction
2. **Multi-line messages**: MESSAGE fields encourage line breaks and formatting
3. **Consistent vocabulary**: Similar field names and structure across protocols
4. **Empty vs missing**: Empty string for optional fields, not omitted
5. **Single source of truth**: This document is referenced, not duplicated
