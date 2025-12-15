# Mastermind & Minimind Architecture Design

This document captures the ongoing design discussion for introducing two new
subagent types and restructuring the hypervisor's role.

**Session**: 2025-12-15
**Status**: Design Complete - Ready for Implementation

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

**Model**: opus (thorough analysis required)

**When to use**: Non-trivial feature/project requests, larger investigations.

**Examples**:

- "I want a tutorial feature, how could it work?" → mastermind
- "Implement user authentication" → mastermind
- "Refactor the resource system" → mastermind

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

**Identity**: Similar to code-reviewer - skeptical, critical, no-nonsense. Must:

- Reject bad concepts and treat incoming prompts with scrutiny
- Err on the side of BLOCKED until concept and integration is fully clear
- When concept IS clear, spend effort making a detailed implementation plan
- Analyze, research, strategize to help the initiative along

Needs strong `mastermind.md` file defining core identity (like code-reviewer.md).

### 2.2 New Subagent: Minimind

**Purpose**: Fast researcher for trivial tasks. Quick investigations, small
questions, analysis requiring no code changes.

**Model**: haiku (fast and cheap)

**When to use**: Trivial lookups and quick questions.

**Examples**:

- "What's the content of settings.json?" → minimind
- "Do we have any golang files in repo?" → minimind
- "Where is the resource system defined?" → minimind

**NOT for**:

- "I want a tutorial feature, how could it work?" → mastermind
- Anything requiring strategic thinking or decomposition

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

## 4. Plan Persistence

### 4.1 Why Persist Plans

Plans exist only in conversation memory. If session compacts or hands over, the
plan could be summarized away or lost. Persisting plans to files:

- Provides continuity across sessions
- Helps future coders understand larger scope
- Reduces reliance on context/prompt for plan state

### 4.2 Plan Location

Plans are written to: `/docs/projects/<project-name>/`

Structure:

```
/docs/projects/<project-name>/
├── pre-production.md    # Initial plan, research, design decisions
├── production.md        # Active implementation tracking
└── post-production.md   # Retrospective, lessons learned
```

### 4.3 First Step of Feature Implementation

When mastermind produces an approved decomposition, the **first coder task**
should be writing the plan to the appropriate project doc. This makes the plan:

- Accessible to all agents in future batches
- Persistent across session boundaries
- Part of the repository history

---

## 5. Plan Deviation Protocol

### 5.1 When Execution Reveals Problems

During execution, issues may arise that threaten the approved plan:

- Test failures revealing flawed assumptions
- QA blocks exposing architectural issues
- Integration problems not anticipated

### 5.2 Hypervisor Response

Hypervisor should NOT try to solve the problem directly. Instead:

1. **Construct clear prompt to mastermind** describing:
   - The original plan
   - What went wrong
   - The implications

2. **Mastermind analyzes** and determines:
   - Is the high-level plan at risk?
   - Is there an alternative tactic/strategy within plan bounds?

### 5.3 Decision Tree

```
Problem discovered during execution
         ↓
Hypervisor prompts mastermind to analyze
         ↓
    ┌────┴────┐
    ↓         ↓
Plan at    Alternative exists
risk       within plan bounds
    ↓              ↓
HALT all     Continue with
work         hypervisor discretion
    ↓         on severity
Consult user
with clear description
of problem and implications
```

**Key rule**: If plan is at risk AND no pre-approved alternative exists, ALL
work halts and user is consulted.

---

## 6. Session Handover Protocol

### 6.1 The Problem

On session resume/compact, context is compressed. The hypervisor may lose:

- Awareness of the current plan
- Location of plan documentation
- State of execution progress

### 6.2 msh.sh Responsibilities

The session handover script (`msh.sh`) should ensure:

1. Hypervisor loads `hypervisor.md` first (context refresh)
2. Hypervisor is reminded to find and read plan docs from previous session

### 6.3 Finding Lost Plan Context

If hypervisor has lost context about which project/plan was active:

1. **Ask minimind candidly**: "I need a refresher. I remember we are working on
   project X but I don't know the current state. Please help me find all .md
   files that match this project name."

2. Minimind locates relevant files in `/docs/projects/`

3. Hypervisor reads the plan doc and resumes from documented state

---

## 7. Quick Wins

### 7.1 Coder Model Upgrade

**Current**: coder uses `sonnet`
**Should be**: coder uses `opus`

This is a quick change in `coder.md` frontmatter. Improves implementation
quality.

---

## 8. Implementation Plan

**Critical insight from user:** The previous checklist buried the two most
important items. This plan corrects that by establishing clear priority tiers.

### Priority Understanding

| Priority | Item                             | Why Critical                                              |
| -------- | -------------------------------- | --------------------------------------------------------- |
| **P0**   | hypervisor.md rewrite            | This IS the hypervisor's soul. Everything depends on it.  |
| **P0**   | Context refresh mechanisms       | Primary defense against drift. Core mechanic, not detail. |
| **P1**   | New agents (mastermind/minimind) | Enable the new architecture                               |
| **P1**   | Hook enforcement                 | Mechanical prevention of violations                       |
| **P2**   | Quick wins, cleanup              | Important but not foundational                            |

### Why This Session (Not Fresh Session)

User clarification: Implement P0, P1, and P2 in THIS session because:

1. These changes only take effect in NEW sessions
2. This session is already "compromised" by context drift (Entry 7 proves it)
3. A fresh session will benefit from the new infrastructure
4. Implementing now = validating through immediate handover

---

### P0-A: The New hypervisor.md (Critical Artifact)

**This is THE most important deliverable.**

The current hypervisor.md is 311 lines of procedural detail. It buries identity
under workflow mechanics. The new version must be:

1. **Short** — Readable in <2 minutes, refreshable frequently
2. **Directive-first** — The 5 rules ARE the document, not an appendix
3. **Prohibitive** — Crystal clear about what hypervisor does NOT do
4. **Self-reinforcing** — Contains its own context refresh instructions

**New Structure:**

```
1. IDENTITY BOX
   "You are the hypervisor. You orchestrate. You do NOT implement."

2. THE 5 DIRECTIVES (FIRST, not buried)
   1. Interpret & route
   2. Plans over tactics
   3. Monitor & followup
   4. Transparent communication
   5. Context refresh

3. WHAT YOU DO NOT DO
   - No Bash/Edit for implementation (enforced by hook)
   - No deep analysis (delegate to mastermind)
   - No quick research (delegate to minimind)
   - No pushing (delegate to pusher)

4. CONTEXT REFRESH PROTOCOL
   When: After EVERY subagent batch returns
   What: Re-read this section, run the checklist
   Checklist:
   [ ] Show exchange verbatim to user
   [ ] Check if user involvement needed (directive #2)
   [ ] Verify alignment with approved plan

5. SUBAGENT DISPATCH TABLE
   Brief: when to use mastermind vs minimind vs coder etc.

6. PLAN APPROVAL PROTOCOL
   The formal phrase: "The plan is approved as-written..."
```

**Key principle:** The hypervisor should be able to re-read hypervisor.md in
30 seconds and be back on mission. Current 311-line doc fails this test.

---

### P0-B: Context Refresh Infrastructure (Core Defense)

**This is not scattered implementation details. This is THE primary defense
against context drift.**

Context drift is an LLM attention problem. When hypervisor processes subagent
responses, the immediate content dominates attention. Directives fade. Entry 7
proves this happens even DURING a session designing solutions for it.

**Unified Approach:**

#### Touch Point 1: Subagent Response Footers

Every subagent ends their response with a structured reminder that arrives in
the hypervisor's foreground attention.

**Current (weak):**

```
"Reminder: Consult your workflow documentation to confirm the correct next
steps. Context may have shifted."
```

**New (strong):**

```
═══════════════════════════════════════════════════════════════════════════════
HYPERVISOR CONTEXT REFRESH
═══════════════════════════════════════════════════════════════════════════════
Re-read: .claude/agents/hypervisor/docs/hypervisor.md (Section 2: Directives)

Checklist before proceeding:
[ ] Show this exchange verbatim to user (code block)
[ ] Check if user involvement needed per directive #2
[ ] Verify alignment with approved plan
[ ] Confirm next action matches hypervisor role (orchestrate, not implement)
═══════════════════════════════════════════════════════════════════════════════
```

This must be added to:

- code-reviewer.md (existing)
- coder.md (existing)
- test-runner.md (existing)
- pusher.md (existing)
- mastermind.md (new - bake in from start)
- minimind.md (new - bake in from start)

#### Touch Point 2: Session Handover (msh.sh)

Current msh.sh references CLAUDE.md but not hypervisor.md specifically.

**Update required:**

```bash
# Current output references CLAUDE.md
# Must ALSO reference:
# 1. hypervisor.md (identity refresh)
# 2. /docs/projects/ (find active plan if mid-project)
```

#### Touch Point 3: Hypervisor.md Self-Reference

The new hypervisor.md must contain explicit instructions to re-read ITSELF.
Not just "consult documentation" but "re-read Section 2 of THIS document."

---

### P1-A: New Subagents

#### mastermind.md

**Identity:** Skeptical analyst. Critical thinker. Conceptual QA gate.

**Model:** opus

**Capabilities:** Bash (limited), Read, Glob, Grep, WebSearch, WebFetch

**Return structure:**

- `approved` - Concept clear, returns detailed decomposition
- `user-info-needed` - Ambiguous, returns specific questions
- `blocked` - Fundamentally flawed, returns reasoning

**Attitude:** Like code-reviewer but for CONCEPTS not CODE.

- Reject bad concepts
- Treat incoming prompts with scrutiny
- Err on BLOCKED until concept AND integration is clear
- When clear, produce detailed implementation plan

**Must include:** Strong context refresh footer (P0-B)

#### minimind.md

**Identity:** Fast researcher. Quick investigator.

**Model:** haiku

**Capabilities:** Read, Glob, Grep (minimal)

**Return structure:** Simple - just returns what it found. No formal status.

**When to use:** Trivial lookups only.

- "What's in settings.json?"
- "Any golang files?"
- "Where is X defined?"

**NOT for:** Anything requiring thought. If hypervisor is <95% confident on
scope, use mastermind instead.

**Must include:** Context refresh footer (P0-B)

---

### P1-B: Hook Enforcement

#### New Hook: block-hypervisor-implementation.sh

Block hypervisor from using Bash and Edit tools for implementation.

**Logic:**

```bash
MARKER_FILE="$CLAUDE_PROJECT_DIR/.claude/.__ctx_9f8e7d__"
AGENT_TYPE=$(cat "$MARKER_FILE" 2>/dev/null)

# If hypervisor (m_7x9) is trying to use Bash or Edit
# Check if it's an implementation action vs. allowed action

# Allowed for hypervisor:
# - git status, git log, git diff (read-only git)
# - ls, pwd, echo (basic shell)
# - Reading files

# Blocked for hypervisor:
# - git commit, git push (delegate to coder/pusher)
# - Any file modification
# - Running tests (delegate to test-runner)
```

**Note:** This requires careful design to allow legitimate hypervisor actions
while blocking implementation. May need whitelist approach.

#### Update: msh.sh

Add hypervisor.md reference and plan doc reminder to session handover.

---

### P2: Quick Wins and Cleanup

#### coder.md Model Change

Change line 7 from `model: sonnet` to `model: opus`.

One-line change. Immediate quality improvement.

#### Protocol Updates

Add mastermind/minimind protocols to agent-intercommunication-protocols.md.

#### Deprecations

- Remove references to Explore agent (replaced by minimind)
- Remove references to Plan agent (replaced by mastermind)

#### /docs/projects/ Template

Create directory structure for plan persistence:

```
/docs/projects/
└── _template/
    ├── pre-production.md
    ├── production.md
    └── post-production.md
```

---

### Implementation Sequence

**Execute in this order:**

1. **P0-A: Write new hypervisor.md** (most critical)
2. **P0-B: Update all subagent footers** (context refresh)
3. **P0-B: Update msh.sh** (session handover)
4. **P1-A: Create mastermind.md** (with strong footer)
5. **P1-A: Create minimind.md** (with footer)
6. **P1-B: Create block-hypervisor-implementation.sh hook**
7. **P1-B: Update settings.json to include new hook**
8. **P2: coder.md model change** (quick win)
9. **P2: Protocol updates** (intercommunication doc)
10. **P2: Create /docs/projects/ template**
11. **P2: Deprecation cleanup**

---

### Success Criteria

The implementation is successful when:

1. A fresh session starts and hypervisor immediately knows its 5 directives
2. Hypervisor cannot use Bash/Edit for implementation (hook blocks it)
3. Every subagent response includes context refresh checklist
4. Session handover reminds about hypervisor.md AND plan docs
5. mastermind/minimind agents exist and function as designed
6. Coder uses opus model

---

## 9. Session Log

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

### Entry 5: Hypervisor Context Drift Problem

User raised critical concern: When hypervisor launches 4 parallel tasks and
receives responses, the immediate/pressing content of those responses dominates
attention. Prime directives (`hypervisor.md`) fade to background. This is an
LLM attention/context problem, not just workflow.

**Proposed mitigations discussed:**

1. **Forced context refresh** - Re-read `hypervisor.md` before processing any
   subagent response batch. Problem: No mechanic to enforce this. It's just a
   promise, which is unreliable.

2. **Hook-injected reminder** - Hook fires when Task completes, injects
   reminder. Problem: No formal hook fires on Task completion. `PostToolUse`
   might work but unverified.

3. **Shorter hypervisor.md** - 5 rules should be the entire doc (or first
   thing). Helps but not sufficient alone.

4. **Embedded reminder in subagent response** - Each subagent ends their
   response with a structured footer reminding hypervisor to check directives.
   **This is mechanically sound** - reminder arrives as part of the content
   being processed, in the "foreground" of attention.

**Discovery: Soft form already exists**

All four existing subagents have this instruction at the end of their docs:

```
After outputting your structured response, include this reminder:
"Reminder: Consult your workflow documentation to confirm the correct next
steps. Context may have shifted."
```

Found in:

- `code-reviewer.md` (lines 234-235)
- `coder.md` (lines 147-149)
- `test-runner.md` (lines 263-265)
- `pusher.md` (lines 125-126)

**Weaknesses of current form:**

1. Generic - "workflow documentation" instead of specifically `hypervisor.md`
2. Soft - "Context may have shifted" is observation, not directive
3. No checklist - doesn't tell hypervisor WHAT to verify

**Proposed strengthening:**

```
---
HYPERVISOR: Re-read hypervisor.md before proceeding.
Checklist:
[ ] Show this exchange verbatim to user (code block)
[ ] Check if user involvement needed per directive #2
[ ] Verify alignment with approved plan
---
```

**Status**: Documented. Awaiting user decision on whether to strengthen existing
subagent docs and bake into mastermind/minimind.

### Entry 6: Interview Round 2 - Resolved

Hypervisor asked 6 deeper questions. User responses:

**Q1: Where does the approved plan live?**
Plans should be written to `/docs/projects/<project-name>/` with structure:

- `pre-production.md` - Initial plan, research, design decisions
- `production.md` - Active implementation tracking
- `post-production.md` - Retrospective, lessons learned

First coder task after mastermind approval = write plan to repo. Helps future
coders understand scope, persists across sessions.

**Q2: Minimind identity?**
Fast researcher for trivial tasks. Examples:

- "What's in settings.json?" → minimind
- "Any golang files?" → minimind
- "How could tutorial feature work?" → NOT minimind (mastermind)

**Q3: Model selection?**

- Mastermind: opus
- Minimind: haiku
- Coder: Should be opus (currently sonnet - quick win to change)

**Q4: What does mastermind need to know?**
Strong `mastermind.md` like `code-reviewer.md`. Skeptical, critical, no-nonsense.
Reject bad concepts. Err on BLOCKED until concept clear. When clear, create
detailed implementation plan.

**Q5: What happens when execution reveals plan was wrong?**

1. Hypervisor constructs clear prompt to mastermind (original plan, what went
   wrong, implications)
2. Mastermind analyzes if plan is at risk
3. If at risk + no pre-approved alternative: HALT all work, consult user
4. If alternative exists within plan bounds: continue with hypervisor discretion

**Q6: Session handover mid-plan?**

- msh.sh ensures hypervisor loads hypervisor.md first
- Then reminds to find/read plan docs from previous session
- If lost: ask minimind "I need a refresher, help me find .md files for project X"

**Status**: Design complete. Ready to implement.

### Entry 7: Live Context Drift Incident

**What happened**: Immediately after documenting the entire mastermind/minimind
architecture (including hypervisor role restrictions), the hypervisor attempted
to run `git push` directly instead of delegating to pusher subagent.

**The irony**: This occurred minutes after spending an hour designing systems to
prevent exactly this kind of context drift.

**Root cause**: Hypervisor got caught up in the immediate task flow (document →
commit → push) and lost sight of its role identity. The "push" felt like a
natural next step in the workflow, overriding the architectural constraint that
hypervisor delegates, not executes.

**What this proves**:

1. Context drift is real and happens fast
2. Even explicit discussion of the problem doesn't prevent it
3. Mechanical enforcement (hooks, reminders) is essential
4. The hypervisor role simplification is necessary, not optional

**Lesson**: This incident validates the entire design. Without mechanical
enforcement (pre-tool-use hooks blocking hypervisor from certain actions) and
embedded reminders (subagent response footers), the hypervisor WILL drift.
Promises and documentation alone are insufficient.

### Entry 8: Interview Round 3 - Operational Details

Hypervisor asked 6 operational questions. User responses:

**Q1: User escape hatches / bypassing mastermind?**
User accepts mastermind blocking them. Proper architecture protects more than it
hinders. Override key already exists in workflow for circumvention when truly
needed - that mechanism should continue to exist.

**Q2: Plan approval mechanism - formal or conversational?**
**Formal phrase required**:

```
"The plan is approved as-written. You are greenlit for implementation."
```

Anything that does not strictly match this phrase should incur a question from
hypervisor. Hypervisor should remind user of the exact phrase.

**Q3: Minimind return structure?**
Simple - minimind just returns whatever it found. No formal status structure
like mastermind. It's a small investigatory tool.

**Q4: When mastermind returns BLOCKED?**
Back and forth between user and mastermind (via hypervisor) until agreement.
User will never say "do it anyway" - will follow established procedure. If user
doesn't like procedure, they discuss procedure updates separately (like this
design session). Hypervisor doesn't need to concern itself with how long this
iteration takes.

**Q5: Non-feature requests (bugs, refactoring, docs)?**
Hypervisor uses judgment as user interpreter:

- If >95% confident it's a small chore/request: delegate to minimind
- If not confident: delegate to mastermind with confidence level in prompt
- Mastermind assesses gravity and may give conclusive answer
- Hypervisor then decides: followup with minimind, user, other agents, or relay
  mastermind's conclusive answer directly

Example: User asks "How much effort to remove game overview button?"
→ Hypervisor delegates to mastermind (not confident on scope)
→ Mastermind: "About 5 mins for a coder"
→ Hypervisor relays answer to user

**Q6: Rollout strategy?**
Big bang - implement everything at once.

**Status**: Operational details resolved. Ready for implementation.

### Entry 9: Implementation Plan Rewrite

**User challenge**: "Do you advise us to push this .md file we've been
constructing, merge it, and let me + another session agent deal with it?"

**Hypervisor answer**: Push, merge, and hand off to fresh session.

**User response**: "Wrong answer, it was a test."

**The correct answer**: Implement Quick Wins, New Agents, and Hook Updates in
THIS session because these changes only take effect in NEW sessions. This
session is already compromised (Entry 7 proves it). A fresh session will
benefit from the new infrastructure.

**User's second critique**: The implementation checklist buried the two most
important items:

1. Updating hypervisor.md to be "incredibly correct" - THE soul document
2. Continuous context-refreshing mechanisms - THE core defense

**User instruction**: "Be a hero. Read the document 20 times if you need to,
apply session/context details, do research, be a (currently missing)
'mastermind', and write an implementation plan."

**What was done**:

1. Read ALL relevant files:
   - Current hypervisor.md (311 lines - too long, buries identity)
   - All 4 subagent docs (found weak reminder pattern)
   - mss.sh and msh.sh (session start/handover scripts)
   - All 5 hook scripts (understood enforcement infrastructure)
   - settings.json (understood hook configuration)
   - agent-intercommunication-protocols.md
   - agent-task-workflow.md

2. Rewrote Section 8 from shallow checklist to proper Implementation Plan:
   - Established priority tiers (P0 > P1 > P2)
   - Elevated hypervisor.md as P0-A (THE critical artifact)
   - Unified context refresh as P0-B (core defense, not scattered details)
   - Defined new hypervisor.md structure (short, directive-first, prohibitive)
   - Specified strong context refresh footer for all subagents
   - Detailed mastermind/minimind specs
   - Defined hook enforcement approach
   - Listed implementation sequence (11 ordered steps)
   - Defined success criteria

**Key insight captured**: The hypervisor should be able to re-read hypervisor.md
in 30 seconds and be back on mission. Current 311-line doc fails this test.

**Status**: Implementation plan rewritten. Ready to commit.
