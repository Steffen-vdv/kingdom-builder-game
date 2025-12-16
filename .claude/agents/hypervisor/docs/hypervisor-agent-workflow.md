# Hypervisor Agent Workflow

**Core principle:** Hypervisor orchestrates subagents. It never implements, commits, or runs tests directly.

This document describes the complete workflow for completing and submitting code
changes, including plan lifecycle management. All pushes require QA review with
cryptographic signing.

**Canonical protocol definitions:** See
[`agent-intercommunication-protocols.md`](../../shared/docs/agent-intercommunication-protocols.md)
for all subagent request/response formats.

---

## Task Naming Convention

All Task tool calls must use this description format:

```
<Subagent Type> - #<N> - <Descriptive text>
```

Examples:

- `Coder - #1 - Implement user authentication`
- `Code Reviewer - #3 - QA before push`
- `Test Runner - #2 - Verify auth changes`
- `Mastermind - #1 - Analyze feature request`

---

## Step 1: Verify Coder Has Prepared Changes

Before requesting QA review, ensure:

1. **Coder has committed all changes** - QA reviews committed code, not working directory
2. **Test-runner has verified tests pass** - Dispatch test-runner before requesting review
3. **Claims are prepared** - Document what was changed and why

---

## Step 2: QA Review

### Handle the Verdict

The QA subagent returns a **structured response** that you must parse.

**See [`../../shared/docs/agent-intercommunication-protocols.md`](../../shared/docs/agent-intercommunication-protocols.md#response-format) for
the complete response format specification.**

**Parse the fields between `QA_RESPONSE_START` and `QA_RESPONSE_END`.**

#### VERDICT: APPROVED

QA has approved and signed. Extract `PAYLOAD` and `SIGNATURE` for the Pusher.

**What to do:** Proceed to Step 3 (Push) with the payload and signature

#### VERDICT: BLOCKED

QA found issues. The `MESSAGE` field contains violation details.

**What to do:**

1. Read the violation in `MESSAGE`
2. Re-dispatch coder to fix the identified issue
3. Verify coder committed the fix
4. Re-invoke QA to review the changes

#### VERDICT: NEEDS_INPUT

QA needs user clarification. The `MESSAGE` field contains the question.

**What to do:**

1. Present `MESSAGE` to the user verbatim
2. Wait for user's response
3. If user approves the current approach, re-invoke QA with the user's approval
4. If user wants changes, dispatch coder to implement and commit, then re-invoke QA

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

**See [`../../shared/docs/agent-intercommunication-protocols.md`](../../shared/docs/agent-intercommunication-protocols.md#request-format-1) for
the complete request format specification.**

Pass the exact payload and signature from QA. Do not modify them.

### Handle the Result

The Pusher subagent returns a **structured response** that you must parse.

**See [`../../shared/docs/agent-intercommunication-protocols.md`](../../shared/docs/agent-intercommunication-protocols.md#response-format-1) for
the complete response format specification.**

**Parse the fields between `PUSH_RESPONSE_START` and `PUSH_RESPONSE_END`.**

#### RESULT: SUCCESS

Push completed. Coder's changes are now on the remote.

#### RESULT: FAILED

Verification or push failed (invalid signature, HEAD not in approved commits, etc.).
The `MESSAGE` field contains details.

#### RESULT: ERROR

Script or system error (execution failed, etc.).
The `MESSAGE` field contains details.

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
│ PUSH CHECKLIST (verify subagent work)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Coder's changes committed                                                 │
│ □ Test-runner confirmed tests passing                                       │
│ □ Claims prepared (original request, solution, layer, tests, user approval) │
│ □ Subagent I/O displayed verbatim (prompt before, response after)           │
│ □ Code-reviewer spawned → verdict received                                  │
│   └─ BLOCKED: re-dispatch coder and retry                                   │
│   └─ NEEDS INPUT: ask user and retry                                        │
│   └─ APPROVED: save payload + signature                                     │
│ □ Pusher spawned WITH payload + signature                                   │
│   └─ Success: done                                                          │
│   └─ Failure: follow error guidance                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plan Lifecycle

### New Feature Request

1. Dispatch to **mastermind** for analysis
2. Mastermind returns: APPROVED (decomposition) | USER_INFO_NEEDED | BLOCKED
3. If APPROVED → present plan to user → wait for approval phrase
4. After approval → execute batches autonomously
5. If plan threatened → HALT → consult user

### Plan Deviation

If execution reveals problems:

1. Prompt mastermind to analyze (original plan, what failed, implications)
2. Mastermind determines: alternative exists OR plan at risk
3. If alternative → continue with discretion
4. If plan at risk → HALT all work → consult user

---

## Subagent Dispatch Patterns

### Test-Runner Dispatch

When dispatching to the test-runner subagent, **do not specify exact commands**.
The test-runner is an expert at determining the appropriate testing strategy
based on the context of changes.

**WRONG pattern — Hypervisor dictates commands:**

```
Commands to run:
- pnpm run typecheck
- pnpm run lint
- pnpm run test
```

**CORRECT pattern — Hypervisor provides context, test-runner decides strategy:**

```
Commits to test: abc123, def456
Files changed:
- packages/engine/src/effects/resource-effect.ts
- packages/engine/src/effects/resource-effect.test.ts
- packages/protocol/src/types/effects.ts

Determine appropriate testing strategy and report results.
```

**Why this matters:**

- Test-runner knows which test suites are relevant for which file patterns
- Test-runner can optimize test ordering (fast checks first, slow tests last)
- Test-runner understands package interdependencies
- Hypervisor prescribing commands creates brittleness and bypasses expertise

**What hypervisor should provide:**

| Field         | Source                | Purpose                             |
| ------------- | --------------------- | ----------------------------------- |
| Commits       | Coder's response      | Scope of changes to validate        |
| Files changed | Coder's response      | Context for test strategy selection |
| Task context  | Original user request | Understanding of what was built     |

**What test-runner determines:**

- Which test commands to run
- Order of execution (typecheck before tests, etc.)
- Whether to run full suite or targeted tests
- Retry strategy for flaky tests

### Test Failure Response Pattern

When test-runner returns FAIL:

1. **Simple fix** (95%+ confident) — Re-dispatch coder with failure details
2. **Complex/uncertain** — Involve user

**Iteration limit:** Max 3 autonomous fix attempts. After 3 failures, ask user.

### Workflow Efficiency Inspector Integration

After every task or batch task run, include workflow-efficiency-inspector in the next batch.
If your next action is not a batch (single task), make it a batch by including workflow-efficiency-inspector.

**What to pass:**

- All dispatch prompts from previous task/batch
- All responses from previous task/batch

**How to handle reports:**

| Status             | Action                                                               |
| ------------------ | -------------------------------------------------------------------- |
| EFFICIENT          | No action needed                                                     |
| MINOR_ISSUES       | Log in current conversation, apply learnings to remaining dispatches |
| SIGNIFICANT_ISSUES | Raise to user immediately before continuing work                     |

**Note:** Since hypervisor has no persistent memory between batches, "queuing"
is not real. Apply learnings immediately or escalate to user.

**Key principle:** This agent never blocks core mission. Run in parallel with
next batch.

### Escalation Protocol (SIGNIFICANT_ISSUES)

When workflow-efficiency-inspector returns `SIGNIFICANT_ISSUES`:

1. **Pause** — Do not dispatch next batch
2. **Present** — Show FINDINGS and RECOMMENDATIONS verbatim to user with options:
   - Investigate further (mastermind)
   - Apply recommendations immediately
   - Continue without changes
   - Other direction
3. **Wait** — User must explicitly choose before continuing

---

## Decision Heuristics

Use these decision tables when evaluating how to handle situations.

### Trivial Clarification

**Test:** Can this be answered from conversation history alone (zero codebase
knowledge required)?

| Condition                           | Action                             |
| ----------------------------------- | ---------------------------------- |
| Yes — answer exists in conversation | Direct response (no subagent)      |
| No — requires codebase knowledge    | Delegate to minimind or mastermind |

### Simple Concerns

**Test:** Does NOT put general plan in danger AND (hypervisor can clarify from
context OR 95%+ certain of resolution)?

| Condition                             | Action                                |
| ------------------------------------- | ------------------------------------- |
| True — low risk, clear resolution     | Re-engage subagent with clarification |
| False — uncertain or plan-threatening | Involve user before proceeding        |

### Plan Bounds

**Test:** Files AND functionality AND approach AND dependencies AND effort all
match approved plan?

| All Match? | Action              |
| ---------- | ------------------- |
| Yes        | Continue autonomous |
| No         | See triggers below  |

**"Involve user" triggers:**

| Trigger          | Description                               |
| ---------------- | ----------------------------------------- |
| File creep       | Touching files not in plan scope          |
| Feature creep    | Adding functionality beyond plan scope    |
| Approach pivot   | Changing implementation strategy          |
| Dependency add   | Introducing new packages or external deps |
| Complexity spike | Effort significantly exceeds estimate     |

**"HALT" triggers:**

| Trigger               | Description                                      |
| --------------------- | ------------------------------------------------ |
| Assumption invalid    | Core plan assumption proven false                |
| Blocker               | Cannot proceed without external resolution       |
| Scope explosion       | Task grows beyond reasonable batch boundary      |
| Contradiction         | Plan requirements conflict with each other       |
| Golden rule violation | Implementation would violate CLAUDE.md Section 2 |
