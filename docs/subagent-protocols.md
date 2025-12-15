# Subagent Protocols

This document defines the request and response formats for all subagents used in
the push workflow. It serves as the single source of truth for agent I/O specs.

**Referenced by:**

- `.claude/agents/code-reviewer.md` - QA agent definition
- `.claude/agents/pusher.md` - Pusher agent definition
- `docs/agent-task-workflow.md` - Main agent workflow guide

---

## Code Reviewer Protocol

The code-reviewer subagent performs adversarial QA review before push.

### Request Format

Main agent invokes via Task tool with this prompt structure:

```
Review the changes on branch <branch-name>.

ORIGINAL REQUEST:
<The user's original request that led to these changes>

TASK AGENT CLAIMS:
- Solution: <What was implemented and why>
- Layer: <content | engine | web | server | docs>
- Tests: <Test coverage details, or "N/A" for non-code changes>
- User approval: <What the user explicitly approved, or "N/A">

PREVIOUS_APPROVAL (optional):
PAYLOAD: <json from previous APPROVED verdict>
SIGNATURE: <signature from previous APPROVED verdict>

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
- **PREVIOUS_APPROVAL**: Optional. Provides payload and signature from a previous
  APPROVED verdict within the same session. QA verifies the signature and only
  reviews commits not included in the previous approval (incremental review).
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

Main agent invokes via Task tool with ONE of two modes:

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
