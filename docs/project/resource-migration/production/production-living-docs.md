# Resource Migration Project – Production Living Document

This document captures the evolving state of the Resource Migration initiative. Every agent **must** read the entire file before making changes and must append their own update when finishing a task.

## 1. Quick Context

- **Project Name:** Resource Migration (ResourceV2 unification)
- **Goal:** Replace legacy resource/stat/population systems with the unified ResourceV2 platform across engine, content, protocol, and web.
- **Current Phase:** Planning bootstrap – documentation and project scaffolding.

## 2. High-Level Status Snapshot

| Area         | Current State | Owner | Notes                          |
| ------------ | ------------- | ----- | ------------------------------ |
| Engine       | _TBD_         | –     | Pending implementation plan.   |
| Content      | _TBD_         | –     | Legacy systems intact.         |
| Protocol/API | _TBD_         | –     | Awaiting design sign-off.      |
| Web UI       | _TBD_         | –     | Pending migration strategy.    |
| Testing      | _TBD_         | –     | Unified test plan not started. |

Update the table whenever a domain meaningfully changes. Keep comments concise and reference sections below for detail.

## 3. Work Log (append-only)

| Task ID                                                                                                                                                                                                                                                                                               | Date       | Agent       | Scope / Files                                                        | Summary of Work                                                                                                                                      | Tests & Results | Follow-up Actions                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| Resource Migration MVP - P3 - T1                                                                                                                                                                                                                                                                      | 2025-10-22 | gpt-5-codex | docs/project/resource-migration/production/production-living-docs.md | Established 30 task-specific placeholder rows, documented the overwrite protocol, and refreshed the handover baseline for the production living doc. | `npm run lint`  | Future agents should update only their assigned task row and note progress in the Latest Handover section. |
| Resource Migration MVP - P3 - T2                                                                                                                                                                                                                                                                      | 2025-10-22 | gpt-5-codex | packages/protocol/src/index.ts; packages/protocol/src/resourceV2.ts  | Established ResourceV2 definition/group schemas, registry payload, and validation tests.                                                             | `npm run lint`  | None                                                                                                       |
| Resource Migration MVP - P3 - T3                                                                                                                                                                                                                                                                      | 2025-10-22 | gpt-5-codex |
| packages/protocol/src/session/contracts.ts; packages/protocol/src/session/index.ts; packages/protocol/src/config/session_contracts/shared.ts; packages/protocol/src/index.ts; packages/protocol/tests/session-contracts.test.ts; docs/project/resource-migration/production/production-living-docs.md |
| Added ResourceV2 definition/group registries to session contracts, introduced unified resource value snapshots with tier/parent metadata, and refreshed protocol schemas/tests for optional legacy payloads.                                                                                          |
| `npm run lint`; `npm run test --workspace=@kingdom-builder/protocol`                                                                                                                                                                                                                                  |
| Coordinate downstream engine/server serialization to populate ResourceV2 values and fade out legacy resource/stat/population fields.                                                                                                                                                                  |

| Resource Migration MVP - P3 - T4

                                        | 2025-10-22 | gpt-5-codex   | packages/contents/src/config/builders/resourceV2.ts; packages/contents/src/config/builders.ts; packages/contents/tests/resourceV2.builder.test.ts; docs/project/resource-migration/production/production-living-docs.md | Introduced ResourceV2 builder suite covering definitions, tier tracks, groups, and clamp-only value changes with hook suppression metadata, plus regression tests exercising percent/global cost serialization. | `npm run lint`; `npm run test --workspace=@kingdom-builder/contents` | Plan follow-up integration for migrated resources and ensure engine handlers consume builder-generated metadata consistently. |

| Resource Migration MVP - P3 - T5 | 2025-10-22 | gpt-5-codex | packages/contents/src/resourceV2/index.ts; packages/contents/src/resourceV2/definitions.ts; packages/contents/src/resourceV2/groups.ts; packages/contents/src/index.ts; packages/contents/tests/resourceV2.registry.test.ts; docs/project/resource-migration/production/production-living-docs.md | Added ResourceV2 definition/group registries with ordering metadata, primary icon derivation helpers, and initial empty arrays plus coverage validating registry lookups and fallbacks. | `npm run lint`; `npm run test --workspace=@kingdom-builder/contents` | Begin migrating pilot resources into the new registries and wire the startup icon to consume the derived candidate once content lands. |
| Resource Migration MVP - P3 - T6 | 2025-10-22 | gpt-5-codex | packages/contents/src/index.ts; packages/contents/src/resourceV2/index.ts; packages/contents/src/startup.ts; packages/contents/README.md; packages/contents/tests/resourceV2.registry.test.ts | Exported default ResourceV2 registries/metadata for startup consumers, documented the dual-system state, and added coverage for the new helpers. | `npm run lint`; `npm run test --workspace=@kingdom-builder/contents` | Coordinate server/runtime fallbacks to forward ResourceV2 metadata and populate definitions during upcoming migrations. |
| Resource Migration MVP - P3 - T7 | 2025-10-22 | gpt-5-codex | packages/testing/src/factories/content.ts; packages/testing/src/factories/content.test-d.ts; docs/project/resource-migration/production/production-living-docs.md | Added ResourceV2 testing factory helpers for definitions/groups with optional bounds, tier track, and global cost overrides plus type-only coverage. | `npm run lint`; `npm run build --workspace=@kingdom-builder/testing` | Expand sample registries once real ResourceV2 content lands and ensure engine/web tests adopt the new factories. |
| Resource Migration MVP - P3 - T8 | 2025-10-22 | gpt-5-codex | packages/engine/src/resourceV2/registry.ts; packages/engine/src/index.ts; packages/engine/tests/resourceV2/registry.test.ts; docs/project/resource-migration/production/production-living-docs.md | Added engine ResourceV2 registry loader covering definitions/groups with immutable metadata helpers and tests verifying indexing and virtual parent protection. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Integrate the registry into engine session bootstrapping and resource services once ResourceV2 state propagation begins. |
| Resource Migration MVP - P3 - T9 | 2025-10-23 | gpt-5-codex | packages/engine/src/state/index.ts; packages/engine/src/state/resource\*v2.ts; packages/engine/tests/state/state.test.ts; docs/project/resource-migration/production/production-living-docs.md | Added PlayerState ResourceV2 runtime scaffolding with registry-driven initialization, read-only parent aggregation, signed recent gain reset helpers, and coverage validating dual-system behaviour. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Wire ResourceV2 state mutations into effect handlers and snapshot serialization to replace legacy fields in upcoming tasks. |
| Resource Migration MVP - P3 - T10 | 2025-10-23 | gpt-5-codex | packages/engine/src/resourceV2/effects/index.ts; packages/engine/src/effects/index.ts; packages/engine/src/state/resource\*v2.ts; packages/engine/tests/resourceV2/effects/resource*v2_effects.test.ts; docs/project/resource-migration/production/production-living-docs.md | Implemented ResourceV2 add/remove effect handlers with clamp reconciliation, percent rounding, touched/recent delta logging, and hook suppression tracking plus coverage for rounding, clamping, and suppression flags. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Next tie ResourceV2 deltas into snapshot serialization and service-driven hook dispatch so suppressed flags and tier updates propagate. |
| Resource Migration MVP - P3 - T11 | 2025-10-23 | gpt-5-codex | packages/engine/src/resourceV2/effects/index.ts; packages/engine/src/effects/index.ts; packages/engine/tests/resourceV2/effects/resource_v2_transfer_effects.test.ts; docs/project/resource-migration/production/production-living-docs.md | Implemented ResourceV2 transfer handling with donor/recipient reconciliation, added upper-bound increase metadata updates, and introduced coverage for clamp, percent, and parent guard scenarios. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Wire ResourceV2 transfers into services/snapshot hooks and extend builder APIs for transfer/bound effects. |
| Resource Migration MVP - P3 - T12 | 2025-10-23 | gpt-5-codex | packages/engine/src/resourceV2/service.ts; packages/engine/src/context.ts; packages/engine/src/resourceV2/effects/*; packages/engine/tests/resourceV2/**/\*.test.ts | Added a ResourceV2 service that centralizes value/bound updates, hook emission, and recent gain logging; wired EngineContext/effect handlers to use it; and extended tests for hook suppression, signed logging, and bound history tracking. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Follow up by populating the service with real registry data during engine bootstrap and updating snapshots/UI to consume new history flags. |
| Resource Migration MVP - P3 - T13 | 2025-10-24 | gpt-5-codex | packages/engine/src/resourceV2/tier_service.ts; packages/engine/src/resourceV2/service.ts; packages/engine/src/services/services.ts; packages/engine/src/setup/create_engine.ts; packages/engine/src/actions/context_clone.ts; packages/engine/tests/resourceV2/tier_service.test.ts; docs/project/resource-migration/production/production-living-docs.md | Added a ResourceV2 tier management service that evaluates tier tracks, fires enter/exit effects, refreshes passive metadata, and wires into engine services and clones; created targeted tier transition tests. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Coordinate upcoming registry bootstrap so the service receives live content definitions and verify downstream systems consume the refreshed passive metadata. |
| Resource Migration MVP - P3 - T14 | 2025-10-24 | gpt-5-codex | packages/engine/src/actions/costs.ts; packages/engine/src/resourceV2/service.ts; packages/engine/src/setup/player_setup.ts; packages/engine/src/setup/create_engine.ts; packages/engine/tests/actions/costs.global-action-cost.test.ts; packages/engine/tests/helpers.ts; docs/project/resource-migration/production/production-living-docs.md | Enforced ResourceV2 global action cost metadata in engine cost resolution, wired optional registry support, and added coverage for overrides and modifiers. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` | Feed the live ResourceV2 registry into engine/session creation and confirm downstream clients respect the enforced cost. |
| Resource Migration MVP - P3 - T15 | 2025-10-23 | gpt-5-codex | packages/engine/src/setup/create_engine.ts; packages/engine/src/setup/player_setup.ts; packages/engine/src/runtime/player_snapshot.ts; packages/contents/src/registries/resourceV2.ts; packages/engine/tests/config/create_engine-config-overrides.test.ts; packages/engine/tests/runtime/session.test.ts; packages/engine/src/state/index.ts; packages/engine/src/index.ts; packages/engine/tsconfig.json | Wired engine bootstrap to load ResourceV2 definition/group registries from contents or config overrides, initialize player ResourceV2 stores with parent keys and start values, export the parent registry, and expose ResourceV2 snapshots alongside legacy fields. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine` (re-run 2025-10-23) | Verify downstream session serializers and web consumers read the new ResourceV2 snapshot payload before removing legacy resource/stat copies; add guard coverage ensuring parent registries populate during engine creation. |
| Resource Migration MVP - P3 - T16 | 2025-10-23 | gpt-5-codex | packages/engine/src/log.ts; packages/engine/src/runtime/player_snapshot.ts; packages/engine/src/runtime/resource_v2_snapshot.ts; packages/engine/src/runtime/session_gateway.ts; packages/engine/tests/runtime/session.test.ts; tests/integration/dev-mode-start-config.test.ts | Added shared ResourceV2 snapshot cloning, wired `values` into action traces/session snapshots alongside legacy fields, exposed ResourceV2 registries through the local session gateway, and extended engine/integration tests for ordering, tier rollups, and recent gain history. | `npm run lint`; `npm run test --workspace=@kingdom-builder/engine`; `npm run test:integration` | Coordinate downstream client serialization updates so UIs consume ResourceV2 payloads before removing the legacy `resources`/`stats`/`population` mirrors; consider covering action trace recent gain expectations once non-zero traces become common. |
| Resource Migration MVP - P3 - T17 | 2025-**-** | _(add entry)_ | | _(reserved for T17 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T18 | 2025-**-** | _(add entry)_ | | _(reserved for T18 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T19 | 2025-**-** | _(add entry)_ | | _(reserved for T19 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T20 | 2025-**-** | _(add entry)_ | | _(reserved for T20 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T21 | 2025-**-** | _(add entry)_ | | _(reserved for T21 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T22 | 2025-**-** | _(add entry)_ | | _(reserved for T22 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T23 | 2025-**-** | _(add entry)_ | | _(reserved for T23 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T24 | 2025-**-** | _(add entry)_ | | _(reserved for T24 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T25 | 2025-**-** | _(add entry)_ | | _(reserved for T25 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T26 | 2025-**-** | _(add entry)_ | | _(reserved for T26 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T27 | 2025-**-** | _(add entry)_ | | _(reserved for T27 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T28 | 2025-**-** | _(add entry)_ | | _(reserved for T28 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T29 | 2025-**-** | _(add entry)_ | | _(reserved for T29 assignee – update only this row.)_ | | |
| Resource Migration MVP - P3 - T30 | 2025-**-\*\* | _(add entry)_ | | \_(reserved for T30 assignee – update only this row.)\_ | | |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

**Prepared by:** gpt-5-codex
**Timestamp (UTC):** 2025-10-23 18:25
**Current Focus:** Resource Migration MVP - P3 - T16 Engine snapshot ResourceV2 serialization
**State Summary:** Engine runtime snapshots and action traces now emit the ResourceV2 `values` map (with parent, tier, and recent gain metadata) while keeping legacy resource/stat/population mirrors intact. Local session gateways forward ResourceV2 registries, and regression tests cover ordering, parent aggregation, tier transitions, and gain history across engine and integration suites. Lint, engine, and integration commands complete cleanly.

- **Next Suggested Tasks:**
  - Update web/session consumers to read the ResourceV2 `values` payload so legacy mirrors can be phased out safely.
  - Expand action-trace coverage once we have concrete scenarios producing non-empty recent gains to guard against regressions.
  - Monitor registry size/performance impacts as more ResourceV2 definitions land and adjust snapshot helpers if cloning becomes hot.
- **Blocking Issues / Risks:** Client layers still depend on `resources`/`stats`/`population`; coordinate migrations before removing or slimming those mirrors to avoid UI/API regressions.

## 5. Notes & Decisions Archive

Maintain a running list of important updates. Use subheadings with timestamps.

### 2025-10-22 – Work-log placeholder protocol

- Established 30 dedicated rows in the Work Log mapped to Resource Migration MVP - P3 task IDs. Each agent must overwrite only the row matching their assignment to prevent merge conflicts.
- When updating the Work Log, include the task ID, scope summary, tests run, and follow-up actions in the reserved row.

### 2024-**-** – Initial scaffolding

- Placeholder: replace with summary when real work starts.
- Recommended first migration target: **Absorption** (selected for its limited integrations and low risk while still covering stat-specific behaviours).

### 2024-**-** – MVP scope alignment

- MVP delivery is limited to clamp-based reconciliation, parented ResourceGroups, mandatory add/remove/transfer/upper-bound increase effects, percent modifiers, the hook-suppression escape hatch, a single global action cost resource, unified HUD/translations, and signed gain/loss logging (Option A). All other features stay on the backlog for later phases.
- Deferred items (value/bound breakdown capture, additional bound adjusters, Pass/Reject reconciliation, parentless groups, bound-decrease effects, comprehensive validators, tier-based shortfall replacement, extra global cost resources) are tracked in [Deferred (Post-MVP) Work](../pre-production/project-outline.md#5-deferred-post-mvp-work). Do not reintroduce these during daily task triage.
- Phase summaries must log both gains and losses in `recentResourceGains` (Option A) so stakeholders can audit negative swings without waiting for the backlog enhancements.

## 6. Intended Temporary Regressions

Track deliberate breakages created by migration steps so nobody “fixes” them prematurely.

| Description  | Introduced In | Expected Resolution | Status |
| ------------ | ------------- | ------------------- | ------ |
| _(none yet)_ | –             | –                   | –      |

## 7. Pending Follow-ups / TODO Tracker

Use this table for short-lived reminders that do not warrant their own ticket yet.

| Item         | Owner | Due / Trigger | Status |
| ------------ | ----- | ------------- | ------ |
| _(none yet)_ | –     | –             | –      |

## 8. Reference

- [Pre-production documentation](../pre-production/)
- [Agent instructions](./agent-instructions.md)

Keep this document clean, factual, and immediately useful. Remove placeholder text as sections begin to fill with real project information.
