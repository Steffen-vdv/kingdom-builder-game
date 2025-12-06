# Design Document – Resource Migration (ResourceV2 Unification)

## 1. Background

The current codebase splits numeric game state across multiple bespoke systems:

- **Resources** (gold, land yields, etc.) with add/remove/transfer effects and partial support for tiering.
- **Stats** (happiness, growth, absorption) with percent formatting, history tracking, and hovercard breakdowns but no tiering or transfers.
- **Population & Roles** (citizen, legion, council, fortifier) with unique assignment hooks, capacity rules, and bespoke UI.
- **Capacity-style values** (max population) derived through helper services instead of being first-class resources.

Over time these systems diverged in formatting, rounding, logging, translation, and configurability. Designers must understand multiple paradigms and the UI renders similar numbers inconsistently.

## 2. Vision

Create **ResourceV2**, a unified definition and runtime model that expresses every numeric track in the game. The system delivers:

- A single configuration surface for bounds, formatting, history, logging, and tiering.
- Generic ResourceGroups that organise related resources and surface optional virtual parents with computed values.
- Consistent effect handlers, rounding rules, reconciliation options, and transfer semantics.
- Unified translation and UI presentation rules for all resources, eliminating ad-hoc formatting.
- A migration approach that replaces legacy systems incrementally while keeping designers informed via living documentation.

## 3. Current vs. Target State

| Area                | Current State                                                        | Target State                                                                                                                        |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Resource model      | Separate registries for resources, stats, population                 | Single ResourceV2 registry covering all numeric values                                                                              |
| Bounds              | Hard-coded behaviour (some clamp, some reject, some allow negatives) | Per-effect reconciliation against per-resource bounds (Clamp/Pass/Reject)                                                           |
| Percent formatting  | Stats only                                                           | Any ResourceV2 can opt-in via metadata                                                                                              |
| Tiering             | One-off implementation for happiness resource                        | Tier definitions co-located with each ResourceV2; single track per resource, multiple resources supported                           |
| Transfers           | Resources only                                                       | Any ResourceV2 may be transferred (subject to reconciliation)                                                                       |
| History & breakdown | Stats track history; resources optionally log recent gains           | All ResourceV2 track “touched” state; breakdowns configurable for values and bounds independently; recent gains store signed deltas |
| Population parent   | Population total stored separately; citizens act as catch-all        | Population becomes ResourceGroup parent (virtual), value computed from role children; citizens removed                              |
| Action costs        | Per-action configuration with optional allowShortfall                | Global “main action cost” flag defined on ResourceV2; allowShortfall removed in favour of tier-triggered consequences               |
| Protocol            | Distinct `resources`, `stats`, `populations` payloads                | Single `values` map plus metadata for groups/parents/tiering                                                                        |
| Web UI              | Multiple panels, divergent translations                              | Unified HUD widget respecting group ordering, standardised hovercards                                                               |

## 4. ResourceV2 Specification

### 4.1 Core Fields

- **id:** unique key.
- **display metadata:** name, icon, lore description, ordering index, percent flag.
- **bounds:** optional `lowerBound` and `upperBound` integers (default absent). Bounds may be modified at runtime by dedicated effects.
- **tracking flags:**
  - `trackValueBreakdown` – whether to capture and expose contribution sources for value changes.
  - `trackBoundBreakdown` – whether to capture sources for bound adjustments.
- **tierTrack:** optional definition with ordered thresholds, effects on enter/exit, and metadata for UI.
- **group membership:** optional reference to a ResourceGroup definition.

### 4.2 Hooks & History

- Engine tracks whether each resource has ever changed from its initial state (for UI visibility).
- `onGain` and `onLoss` events emit whenever a non-zero delta occurs. Payload: `{ resourceId, amount }` where `amount` is positive.
- Effects may opt out of hook emission when they explicitly request **suppressed notifications**. The suppressor is an opt-in flag on individual effect definitions (`suppressHooks: true`) that skips both `onGain` and `onLoss` dispatch for the resolving delta. Builders wire this flag through to the engine; runtime ignores the field when absent, so the default remains "emit hooks".
- Suppression exists solely to prevent recursive trigger loops (e.g., "on gain gold, gain +1 gold" boosters that would otherwise self-trigger). Designers should reach for content fixes or trigger guards first; the flag is an escape hatch for carefully documented exceptions, not a routine optimisation.
- Zero-delta operations (after rounding or reconciliation) do not emit hooks, update history, or log recent gains.
- `recentResourceGains` records signed entries per evaluation cycle for both gains and losses; zero values are skipped.

### 4.3 Effects & Reconciliation

Supported effect families:

1. `resource:add`
2. `resource:remove`
3. `resource:transfer`
4. `resource:lower-bound:increase`
5. `resource:lower-bound:decrease`
6. `resource:upper-bound:increase`
7. `resource:upper-bound:decrease`

Key rules:

- Add/remove effects accept static integers or percentages. Percent modifiers sum before applying to the current value as `(current * totalPercent)`, using explicit rounding (`up`, `down`, `nearest`→ties up). Resulting integer applies as the delta.
- **MVP scope:** runtime and builders only ship with **Clamp** reconciliation. `Pass` and `Reject` strategies remain in the schema but are deferred for later phases and must not be exposed in content or engine toggles until the follow-up work lands. Bound-decrease effects (`resource:lower-bound:decrease`, `resource:upper-bound:decrease`) are likewise postponed; they stay in the specification for completeness but are not implemented during MVP execution.
- Transfers configure reconciliation independently for donor and recipient (when relevant bounds exist). They log contributions when the resource tracks breakdowns.
- Bound adjustments do not alter current values unless reconciliation requires clamping; designers must configure follow-up effects explicitly when needed.
- Deferred telemetry: capturing separate value/bound breakdown sources is out of scope for MVP; only high-level touched state persists. A dedicated backlog item tracks the richer breakdown capture to unblock analytics later.

### 4.4 ResourceGroups & Virtual Parents

- ResourceGroups define ordering and an optional `parent` object.
- When a parent is present:
  - Parent is a **Limited ResourceV2**: participates in metadata, requirements, tiering, and bound adjustments but rejects direct value mutations. Engine enforces read-only value, computed as sum of children (relation `sumOfAll` during this project).
  - Parent appears in state snapshots and protocol payloads with its own metadata.
- Groups without parents still provide structural grouping for UI via shared `groupId`; children render consecutively based on their own ordering.
- Resource ordering operates at two levels:
  - Top-level ordering intermixes standalone resources and groups.
  - Within a group, each child has its own `order` relative to siblings. Parent implicitly renders before children.
- **MVP scope:** only ResourceGroups that define a parent make it into the initial rollout. Purely structural, parentless groups are deferred and must not be added to the registry until the post-MVP follow-up lands.

### 4.5 Tiering

- Each ResourceV2 may define **one** tier track. Multiple resources can use tiering concurrently.
- Tier thresholds map ranges to effects/passives.
- Entering a new tier automatically removes the previous tier’s passives/effects before applying new ones, preventing overlap.
- Tier definitions support negative ranges and asymmetrical spans (e.g., happiness –10..10).

### 4.6 Global Action Costs

- Resource definitions may flag themselves as global action costs with a fixed amount.
- Validation enforces that no action specifies explicit costs for these resources; they are implicitly charged for every action.
- Exceptional costs require removing the global flag and configuring per-action values explicitly.
- There is no escape hatch for debugging or tutorials; instead manipulate player resources via separate effects.
- **MVP scope:** only a single global cost resource (the primary action point track) ships initially. Supporting multiple simultaneous global cost resources is deferred.

## 5. Protocol & UI Changes

- Collapse `resources`, `stats`, and `populations` into `values` plus a metadata payload describing ResourceGroups, ordering, percent formatting, and tier status.
- Hovercards display:
  - Resource description from metadata (static lore text).
  - Optional breakdown (value changes and, separately, bound adjustments).
  - For parents: show parent description followed by child descriptions, each with icon/title and double newline separation.
- Unified HUD orders entries by metadata order; groups render as contiguous blocks with optional parent header.
- Translation pipeline becomes ResourceV2-centric, removing special-case formatters. All effect logging uses the same grammar irrespective of resource origin.
- Action panels highlight global costs once, with per-action deltas listed separately.
- Logs/summary cards use ResourceV2 metadata and `recentResourceGains` signed entries to present net changes. **MVP scope locks in “Option A”** (signed gain/loss logging) so both increases and decreases appear in summaries from day one; the alternative breakdown-style logging remains deferred.

## 6. Content & Builder Updates

- Introduce new builders for ResourceV2 definitions and ResourceGroups; legacy builders remain temporarily for untouched content but will be removed per-resource as migrations complete.
- Builders enforce:
  - One tier track per resource.
  - Explicit rounding on percent operations.
  - Explicit reconciliation strategies whenever bounds exist in the relevant direction.
  - Hook-suppression flags are optional; when present, builders surface configuration for effect authors and validate that the flag is justified (e.g., documented recursion risk) rather than a convenience toggle.
  - Ban on configuring global cost resources as explicit action costs.
  - Prevention of effects targeting Limited ResourceV2 parents with value mutations.
- **MVP scope:**
  - Clamp reconciliation, mandatory add/remove/transfer/upper-bound increase effects, percent modifiers, the hook-suppression escape hatch, unified HUD/translations, and Option A logging are the only engine/builder behaviours implemented immediately.
  - Builder validation covers only the above mandatory surfaces; comprehensive validators (e.g., ensuring every effect chain has matching tier definitions or future bound adjusters) remain on the post-MVP plan.
- Citizens concept removed; designers must specify exact resources when creating or moving units.
- Effects that previously relied on `allowShortfall` must migrate to tier-based consequences (e.g., bankruptcy tier for gold < 0). **However, the tier-based replacement is deferred to the post-MVP backlog, so MVP work focuses on removing the legacy `allowShortfall` flag and preventing new usages without introducing the tier automation yet.**
- Transfer mechanics rely on two resource adjustments configured at the action level; the simulation system ensures atomicity.

## 7. Deferred (Post-MVP) Scope

The following items remain part of the long-term design but are explicitly out of scope for the MVP implementation and must be scheduled for later phases:

- Value and bound breakdown capture.
- Additional bound adjusters beyond upper-bound increases.
- `Pass` and `Reject` reconciliation strategies.
- ResourceGroups without parents.
- Bound-decrease effects (lower-bound decrease, upper-bound decrease).
- Comprehensive builder validators beyond the MVP guardrails listed above.
- Tier-based shortfall replacement flows (including the richer alternative to `allowShortfall`).
- Additional global cost resources beyond the primary action cost track.

Document owners must ensure that each deferred item feeds into the post-MVP backlog so the project can reach the full ResourceV2 vision.

## 8. Migration Strategy

1. **Documentation & Alignment** (current step)
   - Produce pre-production docs (this file, project outline, stakeholder definition).
   - Stand up production living document and agent instructions.
   - Update `AGENTS.md` with temporary guidance to enforce documentation reading.
2. **Infrastructure Build-Out**
   - Implement ResourceV2 data structures, builder APIs, effect handlers, and tests.
   - Add validation utilities reflecting the design rules.
   - Create protocol metadata scaffolding and web translation helpers (even if unused initially).
3. **Incremental Migrations**
   - Migrate one resource/stat/population at a time end-to-end (engine, content, protocol, web). Start with **Absorption** as the pilot ResourceV2 conversion because it is a small, low-risk stat with limited integrations.
   - After each migration, remove the legacy definition and leave breadcrumbs documenting the change.
   - Maintain the living doc with temporary regressions and next steps.
4. **System-Wide Adoption**
   - Once all numeric tracks moved, retire legacy systems, builders, and translation code.
   - Consolidate tests and content to use ResourceV2 exclusively.
5. **Stabilisation & Launch Prep**
   - Execute post-production checklist (functional/regression tests, cleanup tasks).
   - Finalise architectural documentation in `docs/architecture/`.

## 9. Testing Plan

- **Unit Tests:**
  - ResourceV2 builder validation (bounds, tier uniqueness, global cost rules).
  - Effect handlers covering reconciliation modes, percent rounding, transfer logging, and virtual parent protections.
- **Integration Tests:**
  - ResourceGroup behaviour (parent totals, ordering, snapshot metadata).
  - Tiering transitions applying/removing passives.
  - Action resolution enforcing global costs and failing on invalid overrides.
- **Property-Based Tests:**
  - Bound reconciliation against random sequences of effects to ensure invariants hold.
- **UI Tests:**
  - Snapshot/renderer checks for unified HUD and hovercards once web migration begins.

## 10. Risks & Mitigations

- **Documentation Drift:** Mitigated by mandatory reading instructions and structured living doc updates.
- **Partial Migrations Causing Confusion:** Each resource migration removes legacy code and records intended regressions to discourage accidental reverts.
- **Complex Validation:** Builder validators enforce rules upfront, reducing runtime surprises.
- **Translation Regression:** Unified ResourceV2 translators designed early, tested with representative resources before broad rollout.

## 11. Open Questions (none outstanding)

All clarifications from the Q&A are resolved. Future discoveries must be captured in the living doc and, if fundamental, backported into this design document.
