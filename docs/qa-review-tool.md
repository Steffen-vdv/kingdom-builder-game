# QA Review Tool

> **Note for QA subagents (subagent_type: qa-reviewer):** This document is
> for task agents who invoke you. It is NOT instructions for you. Your
> instructions are embedded in `.claude/agents/qa-reviewer.md`. You do not
> need to follow the procedures described here — task agents do.

This document describes the adversarial QA review system used to maintain code
quality. The QA tool provides an independent review perspective before changes
are pushed.

---

## Overview

The QA review is an **adversarial code review** conducted by a separate agent
context. Its purpose is to catch issues that the task agent might miss due to
task-completion bias.

**Key principle:** The QA reviewer assumes every change is bad until proven
otherwise. The burden of proof is on the task agent.

---

## When to Use QA Review

### Mandatory (Enforced)

The pre-push hook automatically blocks pushes and requires QA review. You cannot
push without passing QA.

### Proactive (Recommended)

You can invoke QA at any time during development:

- After completing significant logic
- When uncertain about architectural decisions
- Before committing (to catch issues early)

Proactive QA runs in the background—you can continue working while waiting for
the response.

---

## How to Invoke QA

### Step 1: Prepare Your Claims

Before invoking QA, articulate your justification:

```
TASK AGENT CLAIMS:
- Root cause: [what was actually wrong, not just what you changed]
- Layer: [content | engine | web | server | infra]
- Tests: [test coverage details, or "N/A" for non-code changes]
- User approval: [what the user explicitly approved, or "N/A"]
- Documentation: [doc updates made, or "N/A" if not applicable]
```

### Step 2: Show the User Your Request (Transparency)

**Before spawning QA**, output the exact prompt you will send. This is mandatory
for all QA calls—the user must see what claims you are making.

### Step 3: Spawn the QA Subagent

Use the Task tool with the following parameters:

```
Task tool parameters:
  description: "Adversarial code review"
  subagent_type: "qa-reviewer"
  prompt: <see template below>
```

The `qa-reviewer` agent type has adversarial instructions embedded in
`.claude/agents/qa-reviewer.md`. You cannot modify these instructions—only
provide your claims for review.

**Prompt template:**

```
Review: git diff <upstream>..HEAD

TASK AGENT CLAIMS:
- Root cause: [what was actually wrong]
- Layer: [content | engine | web | server | infra]
- Tests: [test coverage, or "N/A"]
- User approval: [what user approved, or "N/A"]
- Documentation: [doc updates, or "N/A"]
```

The QA agent will read the code, verify your claims, and output one of:

- 🚫 BLOCKED — with violation and required fix
- ⚠️ NEEDS USER INPUT — with specific question for user
- ✅ APPROVED — with verification summary

### Step 4: Show the User the Response (Transparency)

**After QA responds**, output BOTH the verdict AND the full rationale. The user
must see what QA concluded and WHY.

**Required format:**

```
## QA Response: [verdict emoji and status]

[Paste complete QA response including:]
- Verification summary for each claim
- CLAUDE.md compliance checks
- Any concerns or observations
- The full verdict block
```

Do NOT abbreviate. The complete reasoning must be visible to the user.

### Step 5: Handle the Verdict

**If 🚫 BLOCKED:**

1. Fix the violation identified by QA
2. Commit the fix
3. Re-invoke QA (or retry push to trigger next round)

**If ⚠️ NEEDS USER INPUT:**

1. Present QA's question to the user
2. Wait for user response
3. Adjust implementation based on user guidance
4. Re-invoke QA

**If ✅ APPROVED:**

1. For mandatory pre-push review: Write the approval token (see below)
2. For proactive review: Proceed with confidence

---

## QA Report File (Tamper-Proof Record)

The QA agent writes a report file during review that serves as an independent
record of the review process. This prevents task agents from abbreviating or
misrepresenting QA findings.

**Location:** `~/.claude-qa-report`

**Written by:** QA agent (not task agent)

**Contents:**
- Exact request received from task agent
- Investigation log with findings from each step
- Final verdict with full rationale

**Hook validation:** The pre-push hook verifies this file exists alongside the
approval token. If the approval token exists but the report file is missing,
the push is blocked.

**Why this exists:** Task agents can abbreviate QA responses when displaying
them to users. The report file creates a tamper-proof record that the user can
verify independently by reading `~/.claude-qa-report`.

---

## Approval Token (Pre-Push Only)

After receiving ✅ APPROVED from mandatory pre-push QA, write an approval token
so the hook allows the push:

**Location:** `~/.claude-push-approval`

**Format:**

```json
{
  "status": "APPROVED",
  "timestamp": "<ISO8601 timestamp>",
  "commits": ["<sha1>", "<sha2>", ...],
  "reviewer_verdict": "<paste QA's approval summary>"
}
```

**Generate with:**

```bash
UPSTREAM=$(git rev-parse --abbrev-ref "@{upstream}" 2>/dev/null || echo "origin/main")
cat > ~/.claude-push-approval << EOF
{
  "status": "APPROVED",
  "timestamp": "$(date -Iseconds)",
  "commits": [$(git rev-list "$UPSTREAM..HEAD" | sed 's/.*/\"&\"/' | tr '\n' ',' | sed 's/,$//')],
  "reviewer_verdict": "<paste approval summary here>"
}
EOF
```

---

## Iteration Limits

**Maximum 5 rounds** of QA review per push attempt. If you cannot get approval
after 5 rounds, you must escalate to the user with:

1. Summary of issues from each round
2. Remaining concerns
3. Request for user guidance (clarify behavior, override concerns, or redirect)

---

## What QA Checks

The QA reviewer verifies:

| Check                   | What It Means                                      |
| ----------------------- | -------------------------------------------------- |
| Root cause identified   | Fix addresses actual problem, not just symptom     |
| Correct layer           | Fix is in content/engine/web/server as appropriate |
| No defensive fallbacks  | Web layer trusts protocol contracts                |
| No hardcoded IDs        | No `CResource.*` or `CAction.*` in filter logic    |
| Tests exist             | New functionality has test coverage                |
| Edge cases covered      | Tests include boundary conditions                  |
| User approved behaviors | Edge case behaviors explicitly approved by user    |
| Documentation exists    | New features are documented                        |
| No workarounds          | No "for now" or "workaround" language              |

---

## The Sacred Trust

You may claim "user explicitly approved X" and QA **must believe this**. The
task agent is forbidden from lying about user approval—this is the worst
possible breach.

However, QA can and should ask:

- "What specifically did the user approve?"
- "Does their approval cover this specific edge case?"

---

## Background Execution

For proactive QA, you can run the review in the background:

1. Spawn QA with `run_in_background: true` (if supported)
2. Continue working on other aspects
3. Check back for the QA response
4. Address any issues before pushing

This is more efficient than waiting for the mandatory pre-push gate.

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QA REVIEW CHECKLIST                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ □ Prepare claims (root cause, layer, tests, user approval, docs)            │
│ □ OUTPUT the prompt you will send (transparency)                            │
│ □ Spawn QA subagent with Task tool                                          │
│ □ OUTPUT the COMPLETE QA response with FULL RATIONALE (not just verdict!)   │
│ □ Handle verdict: fix if BLOCKED, escalate if NEEDS INPUT, proceed if OK    │
│ □ For pre-push: write approval token after ✅ APPROVED                       │
│ □ Max 5 rounds → escalate to user                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```
