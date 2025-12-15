# Agent Task Workflow

This document describes the complete workflow for completing and submitting code
changes. All pushes require QA review with cryptographic signing.

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PUSH WORKFLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PREPARE                                                                 │
│     └─→ Commit your changes                                                 │
│     └─→ Prepare your claims (root cause, layer, tests, user approval)       │
│                                                                             │
│  2. QA REVIEW                                                               │
│     └─→ Spawn code-reviewer subagent                                        │
│     └─→ Handle verdict: BLOCKED → fix, NEEDS INPUT → ask user               │
│     └─→ If APPROVED: receive {payload, signature} from QA                   │
│                                                                             │
│  3. PUSH                                                                    │
│     └─→ Spawn pusher subagent WITH {payload, signature}                     │
│     └─→ Pusher runs verify-and-push.sh to verify and push                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Prepare Your Changes

Before requesting QA review:

1. **Commit all changes** - QA reviews committed code, not working directory
2. **Run tests** - Ensure tests pass before requesting review
3. **Prepare your claims** - Articulate what you changed and why

### Claims Template

**See [`../shared/docs/agent-intercommunication-protocols.md`](../shared/docs/agent-intercommunication-protocols.md#request-format) for
the complete request format specification.**

---

## Step 2: QA Review

### Display Requirements for Subagent Communication

**For every subagent invocation (code-reviewer, pusher), you must:**

1. **Before invoking:** Display the exact prompt in a code block
2. **After receiving response:** Display the structured response block verbatim in a code block

This is for traceability. Extract only the content between START/END markers (`QA_RESPONSE_START`/`QA_RESPONSE_END` or `PUSH_RESPONSE_START`/`PUSH_RESPONSE_END`) and display it without modifications.

### Spawn the QA Subagent

```
Task(
  subagent_type: "code-reviewer",
  description: "QA review for push",
  prompt: """
    [Use format from ../shared/docs/agent-intercommunication-protocols.md#request-format]
  """
)
```

### Handle the Verdict

The QA subagent returns a **structured response** that you must parse.

**See [`../shared/docs/agent-intercommunication-protocols.md`](../shared/docs/agent-intercommunication-protocols.md#response-format) for
the complete response format specification.**

**Parse the fields between `QA_RESPONSE_START` and `QA_RESPONSE_END`.**

#### VERDICT: APPROVED

QA has approved and signed. Extract `PAYLOAD` and `SIGNATURE` for the Pusher.

**What to do:** Proceed to Step 3 (Push) with the payload and signature

#### VERDICT: BLOCKED

QA found issues. The `MESSAGE` field contains violation details.

**What to do:**

1. Read the violation in `MESSAGE`
2. Fix the identified issue
3. Commit the fix
4. Re-invoke QA to review the changes

#### VERDICT: NEEDS_INPUT

QA needs user clarification. The `MESSAGE` field contains the question.

**What to do:**

1. Present `MESSAGE` to the user verbatim
2. Wait for user's response
3. If user approves the current approach, re-invoke QA with the user's approval
4. If user wants changes, implement them, commit, and re-invoke QA

#### VERDICT: ERROR

Signing failed (system issue). The `MESSAGE` field has details.

**What to do:** Report to user and retry spawning subagent.

### Iteration Limits

**Maximum 5 rounds** of QA review. If you cannot get approval after 5 rounds:

1. Stop attempting
2. Summarize the issues from each round
3. Present to user and ask for guidance
4. Wait for user direction before proceeding

---

## Step 3: Push

After QA approval, spawn the Pusher subagent **with the payload and signature**.

### Spawn the Pusher Subagent

**IMPORTANT:** Before invoking, display the exact prompt in a code block. After receiving response, display the structured response block verbatim in a code block.

**See [`../shared/docs/agent-intercommunication-protocols.md`](../shared/docs/agent-intercommunication-protocols.md#request-format-1) for
the complete request format specification.**

Pass the exact payload and signature from QA. Do not modify them.

### Handle the Result

The Pusher subagent returns a **structured response** that you must parse.

**See [`../shared/docs/agent-intercommunication-protocols.md`](../shared/docs/agent-intercommunication-protocols.md#response-format-1) for
the complete response format specification.**

**Parse the fields between `PUSH_RESPONSE_START` and `PUSH_RESPONSE_END`.**

#### RESULT: SUCCESS

Push completed. Your changes are now on the remote.

#### RESULT: FAILED

Verification or push failed (invalid signature, HEAD not in approved commits, etc.).
The `MESSAGE` field contains details.

#### RESULT: ERROR

Script or system error (execution failed, etc.).
The `MESSAGE` field contains details.

### Common Failures

| Error                        | Meaning                       | What To Do                  |
| ---------------------------- | ----------------------------- | --------------------------- |
| Missing payload/signature    | Data not passed to pusher     | Re-spawn pusher with data   |
| Invalid signature            | Signature verification failed | Re-run QA review            |
| HEAD not in approved commits | New commits after approval    | Re-run QA review            |
| Git push failed              | Network or permission issue   | Retry push, or check remote |

---

## Troubleshooting

### Push Blocked - "Use verify-and-push.sh instead"

You tried to run `git push` directly. All agents must use verify-and-push.sh.

**Solution:** Use the pusher subagent as described in Step 3.

### Push Failed - "Invalid signature"

The signature verification failed. The payload may have been modified.

**Solution:** Re-run QA review to get a fresh payload and signature.

### Push Failed - "HEAD not in approved commits"

You made new commits after QA approved.

**Solution:** Re-run QA review to approve the new commits.

---

## What QA Reviews

The QA reviewer verifies your changes against these criteria:

| Check                   | What It Means                             |
| ----------------------- | ----------------------------------------- |
| Root cause identified   | Fix addresses actual problem, not symptom |
| Correct layer           | Fix is in appropriate package             |
| No defensive fallbacks  | Web layer trusts protocol contracts       |
| No hardcoded IDs        | No entity-specific conditionals           |
| Tests exist             | New functionality has test coverage       |
| User approved behaviors | Edge cases explicitly approved by user    |
| Documentation current   | Docs updated if needed                    |

---

## User Approval Claims

You may claim "user explicitly approved X" and QA will accept this. However:

- You must be truthful about what the user approved
- QA may ask for specifics: "What exactly did the user approve?"
- Lying about user approval is a severe breach

If unsure whether user approval covers a specific case, ask the user first.

---

## User Override Push (Escape Hatch)

If the normal workflow is unavailable, the user can authorize a direct push via
an override token.

### Workflow

1. Hypervisor explains why normal workflow cannot be used
2. User provides their override token
3. Hypervisor spawns pusher with override:

```
Task(
  subagent_type: "pusher",
  description: "Override push",
  prompt: """
    User has authorized override push.

    OVERRIDE_TOKEN: <user-provided-token>
    BRANCH: <branch-name>
  """
)
```

4. Pusher verifies the override token and executes push

### Why This Approach

- **User authorization required**: Only user knows the override token
- **Auditable**: Override pushes are logged separately

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PUSH CHECKLIST                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Changes committed                                                         │
│ □ Tests passing                                                             │
│ □ Claims prepared (original request, solution, layer, tests, user approval) │
│ □ Subagent I/O displayed verbatim (prompt before, response after)           │
│ □ QA subagent spawned → verdict received                                    │
│   └─ BLOCKED: fix and retry                                                 │
│   └─ NEEDS INPUT: ask user and retry                                        │
│   └─ APPROVED: save payload + signature                                     │
│ □ Pusher subagent spawned WITH payload + signature                          │
│   └─ Success: done                                                          │
│   └─ Failure: follow error guidance                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```
