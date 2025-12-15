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
│     └─→ Pusher runs verified-push.sh to verify and push                     │
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

```
TASK AGENT CLAIMS:
- Root cause: [what was actually wrong, not just what you changed]
- Layer: [content | engine | web | server | docs]
- Tests: [test coverage details, or "N/A" for non-code changes]
- User approval: [what the user explicitly approved, or "N/A"]
```

---

## Step 2: QA Review

### Spawn the QA Subagent

```
Task(
  subagent_type: "code-reviewer",
  description: "QA review for push",
  prompt: """
    Review the changes on branch <branch-name>.

    TASK AGENT CLAIMS:
    - Root cause: <your root cause analysis>
    - Layer: <which layer owns this change>
    - Tests: <test coverage, or N/A>
    - User approval: <what user approved, or N/A>
  """
)
```

### Handle the Verdict

The QA subagent will return one of three verdicts:

#### ✅ APPROVED

QA has approved and signed the changes. The response includes:

```
═══════════════════════════════════════════════════════════════════════════════
APPROVAL SIGNED — Data for Pusher
═══════════════════════════════════════════════════════════════════════════════

PAYLOAD:
{"commits":["abc123..."],"diffHash":"def456...","verdict":"APPROVED",...}

SIGNATURE:
a1b2c3d4e5f6...

═══════════════════════════════════════════════════════════════════════════════
```

**Save both PAYLOAD and SIGNATURE** - you'll pass them to the Pusher.

#### 🚫 BLOCKED

QA found issues that must be fixed.

**What to do:**

1. Read the specific violation in the QA response
2. Fix the identified issue
3. Commit the fix
4. Re-invoke QA review (return to Step 2)

#### ⚠️ NEEDS USER INPUT

QA needs clarification on a design decision.

**What to do:**

1. Present QA's question to the user verbatim
2. Wait for user's response
3. If user approves the current approach, re-invoke QA with the user's approval
4. If user wants changes, implement them, commit, and re-invoke QA

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

```
Task(
  subagent_type: "pusher",
  description: "Push approved changes",
  prompt: """
    Push the approved changes.

    PAYLOAD:
    {"commits":["abc123..."],"diffHash":"def456...","verdict":"APPROVED",...}

    SIGNATURE:
    a1b2c3d4e5f6...
  """
)
```

**IMPORTANT:** Pass the exact payload and signature from QA. Do not modify them.

### Handle the Result

#### Success

The pusher will report success. Your changes are now on the remote.

#### Failure

The pusher will report the specific error. Common failures:

| Error                        | Meaning                       | What To Do                   |
| ---------------------------- | ----------------------------- | ---------------------------- |
| Missing payload/signature    | Data not passed to pusher     | Re-spawn pusher with data    |
| Invalid signature            | Signature verification failed | Re-run QA review             |
| HEAD not in approved commits | New commits after approval    | Re-run QA review             |
| crypto-gate not found        | Binary not installed          | Check bin/crypto-gate exists |
| Git push failed              | Network or permission issue   | Retry push, or check remote  |

---

## Troubleshooting

### Push Blocked - "Use verified-push.sh instead"

You tried to run `git push` directly. All agents must use verified-push.sh.

**Solution:** Use the pusher subagent as described in Step 3.

### Push Failed - "Invalid signature"

The signature verification failed. The payload may have been modified.

**Solution:** Re-run QA review to get a fresh payload and signature.

### Push Failed - "HEAD not in approved commits"

You made new commits after QA approved.

**Solution:** Re-run QA review to approve the new commits.

### Push Failed - "crypto-gate not found"

The crypto-gate binary is not installed.

**Solution:**

1. Download crypto-gate binary from releases
2. Place it in `bin/crypto-gate`
3. Make it executable: `chmod +x bin/crypto-gate`

### crypto-gate Tool Not Available

If the QA subagent reports it cannot access the crypto-gate MCP tool:

**Solution:**

1. Check that `bin/crypto-gate` exists and is executable
2. Check `.mcp.json` points to the correct path
3. Report to user as environment configuration issue

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
the crypto-gate override verification.

### Prerequisites

The crypto-gate binary must have been built with `CRYPTO_GATE_OVERRIDE` set.
This is a token known only to the user.

### Workflow

1. Main agent explains why normal workflow cannot be used
2. User provides their override token
3. Main agent spawns pusher with override:

```
Task(
  subagent_type: "pusher",
  description: "Override push",
  prompt: """
    User has authorized override push.

    OVERRIDE_TOKEN: <user-provided-token>
    BRANCH: <branch-name>

    Run: scripts/verified-push.sh --override '<token>' '<branch>'
  """
)
```

4. The verified-push.sh script calls crypto-gate to verify the override token

### Why This Approach

- **Cryptographic verification**: Override token is verified by crypto-gate
- **User authorization required**: Only user knows the override token
- **Auditable**: Override pushes are logged separately
- **No secret exposure**: Token verification happens in compiled binary

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PUSH CHECKLIST                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Changes committed                                                         │
│ □ Tests passing                                                             │
│ □ Claims prepared (root cause, layer, tests, user approval)                 │
│ □ QA subagent spawned → verdict received                                    │
│   └─ BLOCKED: fix and retry                                                 │
│   └─ NEEDS INPUT: ask user and retry                                        │
│   └─ APPROVED: save payload + signature                                     │
│ □ Pusher subagent spawned WITH payload + signature                          │
│   └─ Success: done                                                          │
│   └─ Failure: follow error guidance                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```
