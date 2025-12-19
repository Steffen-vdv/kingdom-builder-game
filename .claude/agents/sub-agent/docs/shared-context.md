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

- **Trust prior verdict** on commits that were already reviewed
- **Focus only on new commits** listed in `new_commits`
- **Check for conflicts** between old and new changes (usually none)

Delta is purely commit-based. User prompts are context, not cache keys.
