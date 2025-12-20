# Shared Context for QA Reviewers

This document explains how to interpret the canonical input fields.
Your identity document (injected after this) takes precedence for role-specific
instructions.

---

## Understanding input.json Fields

### prompts (AUTHORITATIVE - User's voice)

These are the actual prompts written by the User. They are:

- **Fragmented** — May include bare confirmations like "Yes", "Go ahead" without
  full context of what was being confirmed
- **Authoritative** — User definitely wrote these exact words
- **Interpret carefully** — Only clear, specific instructions define intent

**How to interpret prompts:**

1. Messages with clear requirements (e.g., "I want A and X", "implement Y
   using Z") define user intent and are LEADING
2. Vague confirmations (e.g., "Yes", "Go ahead", "Approved") confirm a prior
   proposal but do not themselves define requirements
3. When prompts conflict, the most recent clear instruction wins

**Example prompt analysis:**

```
"implement parser using bashlex"     → Clear requirement: use bashlex
"Yes, proceed"                       → Confirmation only, not a requirement
"also add tests for chain parsing"   → Additional clear requirement: add tests
```

### summary (INFORMATIONAL ONLY - Master agent's voice)

This is master agent's description of what was implemented. It is:

- **Potentially drifted** — Master agent may have misunderstood or deviated
  from user's actual requirements
- **Informational** — Useful for understanding what was attempted
- **NOT authoritative** — Never trust over user prompts

**Critical rule:**

If `prompts` contain "I want A and X" but `summary` says "Implemented B and Y":

→ **BLOCK** — Implementation does not meet user requirements.

User intent (prompts) ALWAYS wins over master summary. Your job as a reviewer
is to catch drift between what user asked for and what was actually done.

### Other fields

| Field           | Purpose                                       |
| --------------- | --------------------------------------------- |
| `branch`        | Git branch being reviewed                     |
| `head`          | Current HEAD commit SHA                       |
| `commits`       | Array of commit SHAs in this review           |
| `files_changed` | Array of file paths modified in these commits |

---

## Delta Review

When you receive delta info indicating `DELTA_REVIEW`:

### Core Optimization Rules

1. **DO NOT re-analyze `prior_commits`** — They were already reviewed and approved.
   Skip all analysis on commits listed in `prior_commits`. Only analyze `new_commits`.

2. **Focus ONLY on `new_commits`** — Run your full review process, but scoped only
   to changes introduced by commits in the `new_commits` array.

3. **Check for conflicts** — Verify new commits don't break previously-approved
   behavior (usually trivial — most new commits are additive).

### Handling Prior Blockers

If `prior_blockers` is non-empty, the previous review was BLOCKED. Your job:

1. **For each prior blocker:** Verify the new commits resolve it
2. **If resolved:** Note it in your summary ("Prior blocker X resolved by commit Y")
3. **If NOT resolved:** Keep the blocker in your verdict
4. **Check for new issues:** The new commits may introduce fresh blockers

### Handling Prior Questions

If `prior_questions` is non-empty, the previous review needed input. Your job:

1. **Check prompts:** See if new user prompts answer the question
2. **Check commits:** See if the changes themselves clarify the question
3. **If answered:** Note it in your summary
4. **If NOT answered:** Keep the question in your verdict

### Full Review Fallback

If `mode` is `FULL_REVIEW`, ignore delta optimizations and analyze everything.
Common reasons for full review:

- No prior state exists
- Prior commits not a subset of current (branch was rebased/reset)
- Prior signature verification failed

Delta is purely commit-based. User prompts are context, not cache keys.
