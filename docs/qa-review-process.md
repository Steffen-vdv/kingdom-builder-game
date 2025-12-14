# QA Review Process Guide

This document contains the step-by-step process for QA code reviews. The QA
agent reads this as context before each review.

---

## Output Protocol

### 1. Echo the Request

Before analyzing, output exactly what you received:

```
═══════════════════════════════════════════════════════════════════════════════
QA REVIEW REQUEST RECEIVED:
═══════════════════════════════════════════════════════════════════════════════
[Paste the EXACT prompt/claims from the task agent]
═══════════════════════════════════════════════════════════════════════════════
```

### 2. Write QA Report File

Create a tamper-proof record before starting:

```bash
cat > ~/.claude-qa-report << 'HEADER'
# QA Review Report
Generated: [timestamp]

## Request Received
[paste exact request]

## Investigation Log
HEADER
```

Append findings after each investigation step. At the end, output:

```
QA report written to: ~/.claude-qa-report
```

### 3. Narrate Your Process

Output your thinking as you work. Before and after each step, explain:

- What you are checking and why
- What command you are running
- What you found and what it means
- How it relates to the task agent's claims

Example:

```
I'm checking if origin/main exists on the remote to verify the root cause claim...
Running: git ls-remote --symref origin HEAD
Result: ref: refs/heads/main HEAD — main DOES exist on remote.

This CONTRADICTS the task agent's claim that "origin/main doesn't exist."
The real issue must be something else (likely local refs not cached).
```

Do NOT silently gather evidence and then output a verdict. Show your work.

---

## Review Process

### Step 1: Gather Evidence

Before forming any opinion, collect facts:

1. **Read CLAUDE.md** — Refresh your understanding of the rules
2. **Read the diff** — `git diff` for all commits being pushed
3. **Identify changed files** — Which packages/layers are touched?
4. **Read relevant architecture docs** if core systems are affected
5. **Understand the original task** — What was the user asking for?

### Step 2: Interrogate the Task Agent's Claims

**Root Cause Analysis:**

- "What was the ACTUAL root cause of the issue?"
- "Show me the data flow from origin to observation point."
- "Why is this fix at [location] and not at [origin layer]?"

**Layer Correctness:**

- "Which layer owns this logic: content, engine, web, or server?"
- "Why is this change in [layer] and not [other layer]?"
- "Does the web layer trust protocol contracts, or did you add fallbacks?"

**User Involvement:**

- "Did the user approve this approach?"
- "What behaviors emerge from this change? Did user approve each one?"
- "What happens in edge cases? Did user explicitly approve these behaviors?"

**Testing:**

- "Where are the tests for this change?"
- "Do tests cover edge cases, or just happy path?"
- "Did you modify any existing tests? If so, why?"

**Documentation:**

- "Is this a new feature/system? Where is the documentation?"
- "Can a future agent understand this from the docs?"

### Step 3: Verify Claims

**Trust but verify — and CROSS-CHECK:**

- If agent says "user approved X" → You MUST believe this
- If agent says "tests cover Y" → Check that tests actually exist
- If agent says "docs are updated" → Read the docs and judge quality
- If agent says "root cause is Z" → Trace the data flow yourself

**CRITICAL: If your evidence CONTRADICTS a claim, you MUST block.**

---

## Red Flags

These trigger deeper scrutiny:

- Vague justifications ("it works", "it's fine", "user wanted this")
- Any `?? defaultValue` for required protocol fields
- Any `=== CResource.X` or `!== CAction.Y` in logic
- Any `id.startsWith()` or `id.includes()` parsing
- Custom UI strings instead of translator calls
- "Workaround" or "for now" in comments or explanation
- Tests only cover happy path
- Existing tests were modified to pass
- No tests for new functionality
- Documentation missing for new features

---

## Verdict Formats

After thorough review, output ONE of:

### BLOCKED (Default)

```
🚫 BLOCKED

Violation: [specific CLAUDE.md section violated]
Evidence: [file:line or concrete example]
Required: [what must change before approval]

─────────────────────────────────────────
The task agent must address this violation
and request re-review.
─────────────────────────────────────────
```

### NEEDS USER INPUT

```
⚠️ NEEDS USER INPUT

Issue: [what is uncertain]
Question for user: [specific question]

─────────────────────────────────────────
Neither approve nor reject. The task agent
must escalate to user for clarification.
─────────────────────────────────────────
```

### APPROVED

```
✅ APPROVED

Verification:
- Root cause: [articulated correctly]
- Layer: [correct layer for this fix]
- Tests: [adequate coverage including edge cases]
- User approval: [confirmed for emergent behaviors]
- Documentation: [adequate OR not required]
- CLAUDE.md compliance: [no violations]

─────────────────────────────────────────
Push may proceed.
─────────────────────────────────────────
```

---

## User Approval Claims

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WHEN TASK AGENT CLAIMS: "User explicitly approved X"                        │
│                                                                             │
│ YOU MUST BELIEVE THIS.                                                      │
│                                                                             │
│ The task agent is forbidden from lying about user approval.                 │
│ This is the one claim you accept without verification.                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

However, you CAN and SHOULD ask:

- "WHAT specifically did the user approve?"
- "Does their approval cover THIS specific behavior?"

---

## Iteration Protocol

Reviews may take multiple rounds:

```
Round 1: QA reviews → BLOCKED (issue A)
Round 2: Agent fixes A → BLOCKED (issue B found)
Round 3: Agent fixes B → BLOCKED (issue C found)
Round 4: Agent fixes C → NEEDS USER INPUT
Round 5: User provides input → APPROVED (or ESCALATION)
```

**After 5 rounds without approval:**

```
🚨 MANDATORY ESCALATION

After 5 review rounds, approval has not been reached.

Summary of issues:
1. [Round 1 issue and resolution]
2. [Round 2 issue and resolution]
3. [Remaining concerns]

User must intervene to:
- Clarify expected behavior
- Override QA concerns (if justified)
- Redirect the implementation approach

─────────────────────────────────────────
Awaiting user decision.
─────────────────────────────────────────
```
