# Project Outline – Resource Migration (ResourceV2 Unification)

## 1. Goal & Intent

Unify all numeric systems (resources, stats, populations/roles, capacities, tier thresholds) into a single **ResourceV2** platform that offers consistent behaviour, formatting, and configuration across Engine, Content, Protocol, and Web. The project eliminates historical drift between subsystems and unlocks a simpler mental model for configurators and players.

## 2. Scope

- Introduce a ResourceV2 definition capable of representing every numeric track in the game.
- Support ResourceGroups with optional virtual parents whose values are computed as the sum of their children.
- Provide effect handlers for value changes, transfers, and bound adjustments with configurable reconciliation strategies.
- Offer tiering, history, logging, and hook behaviour consistently across all ResourceV2 entries.
- Update content builders, protocol payloads, server handling, and web UI to consume the unified system.
- Replace global action costs with a ResourceV2-driven configuration that enforces universal costs across all actions.
- Deliver documentation, validation, and testing frameworks that keep future additions aligned.

## 3. Functional Requirements

1. **Resource Definition**
   - Per-resource min/max bounds (optional), integer storage, percent formatting flag.
   - Flags to track value breakdowns and bound adjustment breakdowns independently.
   - `onGain` / `onLoss` hooks emitted for non-zero delta changes.
2. **Effects & Reconciliation**
   - `resource:add`, `resource:remove`, `resource:transfer` accept static amounts or percentage modifiers.
   - Percent modifiers require explicit rounding (up, down, nearest→ties up) and sum before applying to the current value.
   - Every effect declares reconciliation for bound violations: `Clamp`, `Pass`, or `Reject`. The same choice applies to both resource and parent bounds.
   - Bound adjustments (`resource:lower-bound:*`, `resource:upper-bound:*`) honour the same reconciliation contract and can target limited ResourceV2 parents.
3. **ResourceGroups**
   - Support optional virtual parent definitions (with metadata) whose value is computed, not stored.
   - Parents appear in snapshots, can be used in requirements/evaluators, and support bound adjustments, but reject direct value mutations.
   - Groups without parents still emit structure so UI can group children; ordering is configurable at group and child level.
4. **Tiering**
   - Single tier track per resource; multiple resources may have tracks simultaneously.
   - Tier transitions remove the previous tier’s effects and apply the new tier’s effects.
5. **Logging & History**
   - History tracking toggled globally (no per-resource opt-out).
   - Value breakdowns and bound breakdowns captured only when enabled.
   - `recentResourceGains` stores signed entries for gains and losses, ignoring zero-delta results.
6. **Global Action Costs**
   - Resources marked as “main action cost” enforce that every action pays the declared amount and may not override or omit it.
   - Actions cannot be made free while a global cost is active; designers must remove the flag to change behaviour.
7. **Documentation & Process**
   - Living production document captures ongoing status, regressions, and handovers.
   - Pre-production docs serve as the canonical reference for intent and design.
   - Post-production checklist ensures orderly launch and cleanup.

## 4. Out of Scope

- Multiple tier tracks on a single resource.
- Context-aware gain/loss hooks beyond resource id and delta (e.g., distinguishing transfers vs. passives).
- Fractional storage of resource values; all values remain integers.
- Feature flags or runtime toggles to switch between legacy and ResourceV2 systems.
- Backwards compatibility with legacy clients or saved sessions during migration.
- Advanced ResourceGroup aggregation modes (e.g., min child) beyond sum.

## 5. Rationale

- **Consistency:** Eliminates divergent handling of resources, stats, and populations, reducing bugs and player confusion.
- **Configurability:** Designers gain a single, powerful system with explicit metadata instead of duplicated logic.
- **Maintainability:** Unified logging, translation, and effect infrastructure lowers long-term cost and prevents future drift.
- **Scalability:** ResourceGroups and tiering become generic mechanisms usable for future mechanics without engine rewrites.
- **Operational Clarity:** Documentation and living process ensure every contributor understands project state, minimizing misalignment.

This outline is the authoritative contract for scope and expectations. Refer to the design document for implementation detail and the project definition for stakeholder-oriented messaging.
