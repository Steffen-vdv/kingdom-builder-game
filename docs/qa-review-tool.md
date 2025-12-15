# Push Workflow Guide

This document describes the complete workflow for pushing code changes. All
pushes require QA review and use a two-subagent system for security.

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
│     └─→ Handle verdict: BLOCKED → fix, NEEDS INPUT → ask user, APPROVED → 3 │
│                                                                             │
│  3. PUSH                                                                    │
│     └─→ Spawn pusher subagent                                               │
│     └─→ Handle result: success → done, failure → see troubleshooting        │
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

QA has approved your changes and signed the approval file. Proceed to Step 3.

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

After QA approval, spawn the Pusher subagent to push your changes.

### Spawn the Pusher Subagent

```
Task(
  subagent_type: "pusher",
  description: "Push approved changes",
  prompt: "Push the approved changes to origin"
)
```

### Handle the Result

#### Success

The pusher will report success. Your changes are now on the remote.

#### Failure

The pusher will report the specific error. Common failures:

| Error                        | Meaning                          | What To Do                  |
| ---------------------------- | -------------------------------- | --------------------------- |
| No approval file             | QA didn't sign or signing failed | Re-run QA review            |
| Invalid signature            | Approval file corrupted          | Re-run QA review            |
| HEAD not in approved commits | New commits after approval       | Re-run QA review            |
| Git push failed              | Network or permission issue      | Retry push, or check remote |

**For any pusher failure:** The pusher will tell you exactly what went wrong.
Follow the guidance in its response.

---

## Troubleshooting

### Push Blocked - "Main agents cannot push directly"

You tried to run `git push` yourself. Main agents cannot push directly.

**Solution:** Use the pusher subagent as described in Step 3.

### Push Blocked - "No approval file found"

The QA subagent either wasn't invoked or failed to sign.

**Solution:** Run QA review (Step 2). Ensure QA returns ✅ APPROVED.

### Push Blocked - "Invalid signature"

The approval file exists but is corrupted or was tampered with.

**Solution:** Re-run QA review from Step 2.

### Push Blocked - "HEAD not in approved commits"

You made new commits after QA approved.

**Solution:** Re-run QA review to approve the new commits.

### QA Tool Not Available

If the QA subagent reports it cannot access the MCP tool:

**Solution:** Report this to the user as an environment configuration issue.
The MCP server may not be running or properly configured.

### Pusher Tool Not Available

If the Pusher subagent reports it cannot access the MCP tool:

**Solution:** Report this to the user as an environment configuration issue.

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

## Emergency Backdoor Workflow

In rare cases, the normal QA/Pusher workflow may be broken or unavailable:

- MCP tools not available to subagents
- Fixing the workflow itself (meta-work)
- Critical hotfix when workflow is down

### When to Use

This backdoor is **only** for emergencies where:

1. The QA/Pusher subagent workflow is broken or unavailable, AND
2. The changes are urgent or are fixes to the workflow itself

**Do NOT use this for convenience.** The normal workflow exists for security.

### Backdoor Procedure

1. **Explain to the user** why the normal workflow cannot be used
2. **Ask the user** to provide the value of `QA_SIGNING_SECRET`
3. **User provides the secret** (this is the authorization step)
4. **Main agent creates approval file** using the secret:

```bash
# Generate approval payload
COMMITS="[\"$(git rev-parse HEAD)\"]"
DIFF_HASH=$(git diff HEAD~1 | sha256sum | cut -d' ' -f1)
TIMESTAMP=$(date -Iseconds)
PAYLOAD="{\"status\":\"APPROVED\",\"timestamp\":\"$TIMESTAMP\",\"commits\":$COMMITS,\"diffHash\":\"$DIFF_HASH\",\"reviewer_verdict\":\"User-authorized backdoor\"}"

# Sign with HMAC (user provides SECRET)
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Write approval file
echo "{\"status\":\"APPROVED\",\"timestamp\":\"$TIMESTAMP\",\"commits\":$COMMITS,\"diffHash\":\"$DIFF_HASH\",\"reviewer_verdict\":\"User-authorized backdoor\",\"signature\":\"$SIGNATURE\"}" > ~/.claude-push-approval
```

5. **Main agent spawns Pusher** or pushes via MCP tool

### Security Notes

- The user providing the secret IS the authorization
- This bypasses QA review - user takes responsibility for the changes
- The approval file is still cryptographically signed (for audit trail)
- Use sparingly and document why normal workflow was unavailable

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
│   └─ APPROVED: proceed to push                                              │
│ □ Pusher subagent spawned → result received                                 │
│   └─ Success: done                                                          │
│   └─ Failure: follow error guidance                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```
