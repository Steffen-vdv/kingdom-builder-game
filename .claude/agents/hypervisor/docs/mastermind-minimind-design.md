# Mastermind & Minimind Architecture Design

This document captures the ongoing design discussion for introducing two new
subagent types and restructuring the hypervisor's role.

**Session**: 2025-12-15
**Status**: In Progress - Interview Phase

---

## 1. Problem Statement

The hypervisor currently tries to be analyst, strategist, orchestrator, and
communicator simultaneously. This dilutes focus and consumes context that should
be reserved for coordination.

**User-identified friction points:**

1. Little insight on general session plan
2. Too much user involvement in batch tasks
3. Too little insight in subagent request/response
4. Too many instructions causing hypervisor focus loss

---

## 2. Proposed Solution

### 2.1 New Subagent: Mastermind

**Purpose**: Deep analysis, research, decomposition, breakdown. Conceptual QA
gate.

**When to use**: Non-trivial feature/project requests, larger investigations.

**Capabilities**:

- Bash (limited - no git push, follows existing pusher protocol)
- Read, Glob, Grep, WebSearch, WebFetch
- Cannot spawn subagents - works alone

**Return structure** (similar to code-reviewer):
| Status | Meaning |
|--------|---------|
| `approved` | Request is clear and complete. Returns detailed decomposition. |
| `user-info-needed` | Ambiguous or uncertain. Returns specific questions. |
| `blocked` | Request is fundamentally flawed. Returns reasoning. |

**Identity**: Must think deeply, analyze thoroughly, protect against bad/
ambiguous/missing requirements. Will block requests that don't seem right in the
bigger picture.

### 2.2 New Subagent: Minimind

**Purpose**: Quick investigations, small questions, analysis requiring no code
changes.

**When to use**: Small questions that don't warrant mastermind's depth.
Heuristic based on complexity "feel".

**Replaces**: Explore and Plan agents (deprecated in favor of custom agents with
custom .md protocols).

### 2.3 Hypervisor Role Change

**New role**: Pure orchestration - delegate, facilitate, orchestrate,
communicate.

**Tool access**:

- Task (primary)
- Read, Glob, Grep (allowed but disincentivized)
- Bash, Edit, Write (blocked via pre-tool-use hook)

**NOT the hypervisor's job**: Figuring things out, deep analysis, strategizing
on implementation details.

---

## 3. Communication Baseline Discussion

### 3.1 Open Questions

**Session plan visibility** - What does "good insight" look like?

- Bulleted plan at session start that hypervisor maintains?
- Persistent summary updated after each batch?
- Something else?

**Batch task involvement** - What's the right level?

- User approves overall plan, hypervisor executes autonomously until blocker?
- User approves each batch with less detail?
- Something else?

**Subagent communication visibility** - What should user see?

- Full prompts sent to subagents?
- Summary of request/response?
- Only surfaced when something goes wrong?

**Core directives** - If hypervisor.md reduced to 5 rules, what are they?

### 3.2 Decision Authority

**Proposal**: If mastermind returns "approved + decomposition", hypervisor
proceeds with spawning coders without checkpoint - unless decomposition reveals
something surprising or risky.

**Status**: Awaiting user input.

---

## 4. Implementation Checklist

- [ ] Create mastermind subagent definition
- [ ] Create mastermind.md documentation
- [ ] Create minimind subagent definition
- [ ] Create minimind.md documentation
- [ ] Update pre-tool-use hook (mss.sh ~line 28) to block hypervisor Bash/Edit
- [ ] Update hypervisor.md with simplified role
- [ ] Deprecate Explore and Plan references
- [ ] Test communication protocols

---

## 5. Session Log

### Entry 1: Initial Proposal

User proposed:

- Prohibit hypervisor from Bash/Edit (via hook)
- Introduce mastermind for deep analysis
- Introduce minimind for quick questions
- Simplify hypervisor to coordinator role

### Entry 2: Interview Round 1

Hypervisor asked 11 questions. User responded:

1. Mastermind has Bash (limited), Read, Glob, Grep, WebSearch, WebFetch
2. Returns structured output: approved/user-info-needed/blocked (like code-reviewer)
3. Blocking = reports back, hypervisor decides next step
4. Cannot spawn subagents
5. Custom agents replace Explore/Plan for custom .md protocol control
6. Minimind vs mastermind = heuristic based on complexity feel
7. Hypervisor can Read/Glob/Grep but disincentivized - prefer delegation
8. Communication baseline needs deeper discussion (see Section 3)
9. Decision authority combined with topic 8
10. Explore/Plan deprecated
11. Marker detection: see `.claude/mss.sh` ~line 28

### Entry 3: Communication Baseline Questions

Hypervisor posed specific questions about:

- Session plan visibility
- Batch task involvement level
- Subagent communication visibility
- Core hypervisor directives (5 rules)
- Decision authority after mastermind approval

**Status**: Awaiting user response.
