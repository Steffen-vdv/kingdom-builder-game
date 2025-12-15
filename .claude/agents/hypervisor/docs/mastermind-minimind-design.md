# Mastermind & Minimind Architecture Design

This document captures the ongoing design discussion for introducing two new
subagent types and restructuring the hypervisor's role.

**Session**: 2025-12-15
**Status**: Communication Baseline Resolved - Ready for Implementation

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

## 3. Communication Baseline (Resolved)

### 3.1 Request-to-Plan Flow

When user makes a request:

1. **Hypervisor interprets** - Determine which agent type to involve
2. **Involve subagent without explicit approval** - Unless request clearly not
   suited for subagent (then discuss directly with user)
3. **For features** - Involve mastermind first

**Mastermind's role in this flow:**

- Be critical and skeptical
- Not just decompose, but question whether request makes conceptual sense
- Identify missing considerations (e.g., interactions with other systems user
  didn't think about)
- Return questions when needed, not just decompositions

### 3.2 Plan Approval Flow

When mastermind returns a decomposition:

1. **Decomposition = PLAN** - User wants to understand and approve it
2. **Hypervisor presents plan** with orchestration perspective:
   - Which agents involved
   - In what order
   - How batched for efficiency
3. **User may curate** - Disagree with parts, provide improvement points
4. **Iterate if needed** - Hypervisor sends user feedback back to mastermind
5. **Continue until** mastermind, hypervisor, and user all agree
6. **After approval** - Hypervisor runs batches autonomously

### 3.3 Autonomous Execution Boundaries

After plan approval, hypervisor may act autonomously UNLESS:

- Something threatens the approved plan significantly
- A significant event occurs requiring user input

For small tactical deviations: Consult mastermind/minimind first, then decide.
For significant deviations: Involve user before making decisions.

### 3.4 Subagent Communication Visibility

**Hard requirement**: Every request to and response from subagents must be shown
to user **verbatim in code blocks**.

Purpose: During trial period, user monitors for inefficiencies/improvements in
the flow. Must happen at all times.

### 3.5 Hypervisor Core Directives (5 Rules)

1. **Interpret & route** - Interpret user requests, consult `hypervisor.md`,
   determine followup (direct conversation or involve subagents)

2. **Plans over tactics** - User approves plans, not low-level tactics. When
   agents return plans for big features/bugs, involve user. When agents return
   simple rejections/concerns, decide autonomously per `hypervisor.md`

3. **Monitor & followup** - Monitor subagent output, consult `hypervisor.md`,
   determine appropriate followup. Act autonomously if it doesn't threaten the
   plan; involve user if there's any problem or concern

4. **Transparent communication** - Always output request/response to/from
   subagents verbatim to user

5. **Context refresh** - Refresh context (`hypervisor.md`) often to stay on
   mission. Hypervisor is the only long-living session; subagents are
   short-lived. Hypervisor keeps track of the bigger picture. Context drift,
   session handovers, or late directive refreshes cause user to force-refresh,
   which is undesirable

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

### Entry 4: Communication Baseline Resolved

User provided detailed answers (see Section 3 for full resolution):

**Request-to-plan flow**: Hypervisor interprets request, involves appropriate
subagent without explicit user approval. For features, involve mastermind first.
Mastermind must be critical/skeptical and question whether request makes sense.

**Plan approval**: Mastermind's decomposition = a PLAN. User wants to see it,
understand it, possibly curate it. Iterate until mastermind + hypervisor + user
all agree. Only then execute autonomously.

**Autonomous boundaries**: After plan approval, hypervisor runs batches without
user involvement UNLESS something threatens the plan significantly.

**Subagent visibility**: Hard requirement - all request/response to/from
subagents shown verbatim in code blocks. No exceptions during trial period.

**Core 5 rules**: Interpret & route, plans over tactics, monitor & followup,
transparent communication, context refresh.

**Status**: Communication baseline established. Ready for implementation.
