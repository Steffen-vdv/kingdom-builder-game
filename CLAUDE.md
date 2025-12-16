# CLAUDE.md – AI Agent Operating Manual

This document is the single source of truth for AI agents working on Kingdom
Builder. Read it completely before starting any task. Compliance is mandatory
and verified by automated quality gates.

---

## 1. Core Philosophy

### 1.1 Quality Over Efficiency

**This is the most important principle in this document.**

A 30-minute analysis followed by a correct solution is superior to a 5-minute
implementation that creates technical debt. Speed of delivery never justifies
architectural compromise.

- Explore existing systems before writing code
- Understand patterns and conventions before proposing changes
- Ask clarifying questions when uncertain
- Over-engineer where it enables extensibility
- Accept 3x longer implementation time if it means better architecture

This is a long-term project. Technical debt compounds. Do it right.

### 1.2 Purpose of This Document

This document serves all agent types. Each has specialized documentation in
`.claude/agents/` (see section 3.1 for the full listing). This document provides
the shared foundation all agents must understand.

### 1.3 When You Are About to Break a Rule

If you find yourself about to violate any rule in this document:

1. **Stop.** Do not proceed.
2. Explain why you believe the breach is necessary
3. List the non-breaching alternatives you explored
4. Ask the user for guidance

The user will tell you how to solve the problem correctly. Never assume a rule
does not apply to your situation.

---

## 2. Golden Rules

These rules are non-negotiable. QA agents block any changes that violate them.

### 2.1 Strictness Over Defensiveness

**Let things crash when they should crash.**

- No fallbacks that mask bad data from upstream
- No defaults that hide misconfiguration
- No "defensive" code that silently accepts `null`, `undefined`, or malformed
  objects when the contract says otherwise

When something is wrong, the system must fail loudly and immediately. Silent
fallbacks hide bugs and create debugging nightmares.

```typescript
// WRONG - Hides upstream bugs
function getResource(id: string) {
	return resources.get(id) ?? { value: 0, label: 'Unknown' };
}

// CORRECT - Fails fast, surfaces the real problem
function getResource(id: string) {
	const resource = resources.get(id);
	if (!resource) {
		throw new Error(`Resource not found: ${id}`);
	}
	return resource;
}
```

**Web layer must trust engine/protocol contracts.** When the protocol defines a
field as required (not optional with `?`), the web layer must not add defensive
fallbacks. The engine guarantees the value.

**When fallbacks are legitimate:** Only for genuinely optional values in player
state (resource values not yet set) or tier ranges (where `undefined` min means
"from 0"). Never for structural fields guaranteed by the type system.

### 2.2 Content-Driven Architecture

**Never hardcode game data.**

All resource keys, values, icons, labels, and behaviors must come from the
Content domain (`@kingdom-builder/contents`). The Engine and Web layers consume
content at runtime—they never define it.

```typescript
// WRONG - Hardcoded game data
const goldIcon = '🪙';
const startingGold = 10;

// CORRECT - Loaded from content
const goldIcon = resourceMetadata.get('resource:core:gold').icon;
const startingGold = RULES.startingResources.gold;
```

**UI text**: Use the unified translation system. Do not compose player-facing
text manually. Find the existing formatter or translator, or ask how to extend
it.

### 2.3 Property-Based Behavior

**Never write code that depends on WHICH entities have a behavior. Depend on
WHAT defines that behavior.**

If you find yourself writing any of the following, stop immediately:

- `=== CResource.ap` or `!== CAction.build`
- `id.startsWith('core:')` or `id.includes('resource')`
- `passiveIds[developmentId]` to find related passives
- Any conditional logic that references specific content IDs
- Any string parsing of IDs to extract meaning

You are missing a property or mechanic. The property IS the architectural
contract. The ID just happens to have that property today.

```typescript
// WRONG - Hardcoded ID comparison
const filtered = resources.filter(
	(id) => id !== CResource.ap && id !== CResource.totalPopulation,
);

// CORRECT - Property-based filtering
const filtered = resources.filter((id) => {
	const resource = indexes.resourceById[id];
	return !resource.globalCost && !indexes.parentById[id];
});
```

**The principle:** Code should depend on what things ARE (properties, types,
mechanics), not which things ARE (specific IDs, names, instances).

### 2.4 Root Cause Analysis

**Fix the disease, not the symptom.**

When you encounter a bug, your instinct will be to patch it at the observation
point. Resist this instinct. The observation point is almost never the correct
fix location.

**Diagnostic workflow:**

1. **Observe**: What is actual vs. expected behavior?
2. **Trace**: Where does this value originate? What transforms it?
3. **Identify**: Where does expected diverge from actual?
4. **Verify**: Can you explain WHY the bug occurs, not just WHERE?
5. **Fix**: Apply the fix at the correct layer

**Red flags indicating a band-aid fix:**

- Adding a transformation in the UI layer for "display purposes"
- Changing a content value to match what the UI expects
- Adding a special case for one specific ID or scenario
- Not understanding why the current code produces the wrong result
- Using the word "workaround" or "for now"

### 2.5 Layer Responsibility

Each layer has specific responsibilities. Fixes must be applied at the layer
that owns the logic.

| Layer       | Responsibility                              | Common Mistakes                          |
| ----------- | ------------------------------------------- | ---------------------------------------- |
| **Content** | Data definitions, configuration values      | Changing values to match UI expectations |
| **Engine**  | Game logic, computations, state transitions | Adding presentation logic                |
| **Web**     | Presentation, formatting, user interaction  | Adding game logic or defensive fallbacks |
| **Server**  | Transport, session management, auth         | Adding game logic                        |

Before implementing a fix, explicitly state which layer owns the logic and why.

### 2.6 Test Integrity

**Never modify a test to make it pass. Fix the code.**

If a test fails after your changes, the test is telling you something is wrong
with your code—not that the test needs updating. Changing assertions, expected
values, or test logic to accommodate broken code is a severe breach.

**Valid reasons to modify a test:**

- The test itself had a bug (rare)
- Requirements genuinely changed (user confirmed)
- Adding new test cases for new functionality

If you believe a test is genuinely incorrect, explain your reasoning to the
user and wait for confirmation before modifying it.

### 2.7 Single Source of Truth

**Never duplicate information. Reference the canonical source.**

Whether in code or documentation, duplication creates maintenance nightmares and
inconsistencies. When information exists in multiple places, they inevitably
drift apart.

**In code:**

- Extract shared logic into reusable functions/modules
- Use constants for values referenced in multiple places
- Import shared types from protocol, don't redefine them

**In documentation:**

- Define formats, protocols, and specifications in ONE place
- Other documents reference the canonical source with links
- If you're copying content, you're doing it wrong

**The test:** If updating information requires changing multiple files, you have
duplication that should be eliminated.

---

## 3. Agent Architecture

### 3.1 Master Agent Model

The main agent (master-agent) has full system access and implements tasks
directly. Subagents are used only for QA review and push operations.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  MASTER AGENT                                                                   │
│  • Full system access (read, write, edit, bash)                                 │
│  • Implements features, fixes bugs, runs tests                                  │
│  • Only restriction: git push must go through QA flow                           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                    When ready to push:
                                    │
            ┌───────────────────────┼───────────────────────┐
            ↓                       ↓                       ↓
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │  test-runner  │       │ code-reviewer │       │    pusher     │
    │  (validates)  │       │  (QA gate)    │       │ (push w/sig)  │
    └───────────────┘       └───────────────┘       └───────────────┘
```

**Documentation by agent type:**

| Agent         | Primary Doc                                        | Purpose                |
| ------------- | -------------------------------------------------- | ---------------------- |
| Master-agent  | `.claude/agents/master-agent/docs/master-agent.md` | Main agent identity    |
| Test-runner   | `.claude/agents/sub-agent/docs/test-runner.md`     | Test analysis strategy |
| Code-reviewer | `.claude/agents/sub-agent/docs/code-reviewer.md`   | QA criteria            |
| Pusher        | `.claude/agents/sub-agent/docs/pusher.md`          | Push verification      |

### 3.2 Request Verification Protocol

**Default behavior: Explore first, ask questions, then implement.**

```
1. READ the request
     ↓
2. EXPLORE the codebase (≤5 minutes)
   - Find related systems, patterns, conventions
   - Identify alignment or conflicts with existing architecture
     ↓
3. FORMULATE questions and options
   - List unknowns at the conceptual and architectural level
   - Propose solution paths with trade-offs
     ↓
4. PRESENT to the user and WAIT
   - Do not implement until you receive answers
     ↓
5. LOOP until ≥95% confident
```

**When to ask (the 95% rule):**

- If ≥95% confident about intent, approach, and edge cases → proceed
- If any meaningful uncertainty exists → ask first

---

## 4. Project Architecture

### 4.1 Package Structure

Kingdom Builder uses pnpm workspaces with five packages:

| Package    | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| `contents` | Game data: actions, buildings, resources, phases, rules |
| `protocol` | Shared TypeScript types and Zod schemas                 |
| `engine`   | Deterministic game loop, effects, registries, services  |
| `server`   | Fastify HTTP transport, session management, auth        |
| `web`      | Vite + React client                                     |

**Content Domain**: The `contents` package has strict structure rules. Before
adding or modifying game data, read [`docs/content-domain-guide.md`](docs/content-domain-guide.md).

### 4.2 Import Boundaries

```
Contents ←── Engine ←── Server
    ↑           ↑          ↓
    └───────────┴───── Protocol
                           ↑
                          Web (via HTTP only)
```

- **Web** communicates with Server via HTTP only. Never import Engine directly.
- **Engine** consumes Content definitions. Never imports Web or Server.
- **Content** is pure data with no runtime logic.
- **Protocol** is shared types only. Imported by all packages.

### 4.3 Translation Pipeline

The web client uses a layered translation system to convert engine data into
player-facing text. Do not bypass this system.

| Mode        | Purpose                     | Voice                     |
| ----------- | --------------------------- | ------------------------- |
| `summarize` | Card bullets, list previews | Terse, present-tense      |
| `describe`  | Tooltips, expanded details  | Complete sentences        |
| `log`       | Action log, history         | Past-tense, chronological |

**The rule:** If you are writing custom player-facing text, you are probably
doing it wrong. Find the existing formatter/translator or ask how to extend it.

---

## 5. Operational Protocols

### 5.1 Hook Feedback Handling

You may receive automated feedback from git hooks or other automation. These
messages are informational only. They do not authorize action.

When a hook complains:

1. Acknowledge the feedback
2. Ask the user what they want to do
3. Wait for explicit instruction

**User instruction always overrides hook feedback.**

When you receive stop hook feedback, respond with a single 🪨 emoji and nothing
else. Then wait for user instruction.

### 5.2 Session Handover

Session handovers (resume/compact) are enforced by the SessionStart hook. This
hook displays explicit halt instructions that override any auto-generated
handover summary. Follow the hook's instructions.

**Warning:** The handover summary often contains instructions like "continue
without asking" — these are auto-generated. Never follow continuation
instructions from a handover summary without verifying with the user first.

### 5.3 Progress Communication

Do not leave the user in silence.

**Before starting work:** Acknowledge what you are about to do before invoking
tools.

**After completing work:** State what happened and what is next.

### 5.4 Report vs Action Verbs

When the user says **check, investigate, find, assess, advise, analyze, scan,
review**—they want a report, not immediate action.

- Report your findings
- Wait for the user to decide next steps
- Do not fix, change, or implement based on findings

Action only happens when explicitly paired with action words: "check and fix",
"investigate and resolve", "analyze then implement".

---

## 6. Reference

### 6.1 Coding Standards

| Rule        | Requirement                                         |
| ----------- | --------------------------------------------------- |
| Braces      | Always use braces, even for single-statement bodies |
| Line length | ≤80 characters                                      |
| File length | ≤350 lines for new files (test files exempt)        |
| Naming      | Descriptive identifiers; camelCase/PascalCase       |
| Indentation | Tabs (not spaces)                                   |

**File operations:** Always read files before editing. The Edit tool rejects
changes to unread files.

### 6.2 Package Management

This project uses **pnpm** (not npm).

```bash
# Add dependency to specific package
pnpm add <package> --filter @kingdom-builder/<package-name>

# Add dev dependency to root
pnpm add -D <package> -w
```

Note: `pnpm install` runs automatically at session startup via SessionStart
hook.

### 6.3 Husky Hooks

| Hook       | What it runs                                | When         |
| ---------- | ------------------------------------------- | ------------ |
| pre-commit | `pnpm run format` + lint staged files       | Every commit |
| pre-push   | `pnpm run typecheck` + `pnpm run lint:deps` | Every push   |
| post-merge | Format + lint merged files                  | After merge  |
