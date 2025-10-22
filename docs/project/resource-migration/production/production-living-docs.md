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

| Date                                                                                                                                                               | Agent                                         | Scope / Files                                                                                                                                                                                                                                                                                                | Summary of Work                                                                                                                                                                        | Tests & Results                                                                                                                                                                                                     | Follow-up Actions                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-10-22                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/protocol/src/config/resourceV2.ts; packages/protocol/src/config/schema.ts; packages/protocol/tests/resourceV2-schema.test.ts; docs/project/resource-migration/production/production-living-docs.md                                                                                                  | Added ResourceV2 schema/module exports plus validation tests for ResourceV2 payloads.                                                                                                  | `npx tsc -p packages/protocol/tsconfig.json --pretty false` (pass); `npx vitest run --config vitest.protocol.config.ts` (pass)                                                                                      | Draft protocol payload integration plan building on new schema artifacts.                                                                         |
| 2025-10-22                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/protocol/src/effects.ts; packages/protocol/src/config/effect_schemas.ts; packages/protocol/tests/config-schema.test.ts; docs/project/resource-migration/production/production-living-docs.md                                                                                                        | Added effect metadata fields (rounding, reconciliation, hook suppression) plus schema validation and regression coverage.                                                              | `npx tsc -p packages/protocol/tsconfig.json --pretty false` (pass); `npx vitest run --config vitest.protocol.config.ts` (pass); `npm run check -- --filter protocol` (fails: npm-run-all does not support --filter) | Align check workflow to support protocol-only runs or update task instructions.                                                                   |
| 2025-10-22                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/contents/src/config/builders/resourceV2Builder.ts; packages/contents/src/config/builders.ts; packages/contents/src/config/builders/domain/index.ts; packages/contents/src/config/builders/**tests**/resourceV2Builder.test.ts; docs/project/resource-migration/production/production-living-docs.md | Implemented ResourceV2 builders (definition, tier track, ResourceGroup) with guardrails, exports, and regression coverage; refreshed production log guidance.                          | `npm run check -- --filter contents` (fails: npm-run-all rejects `--filter`); `npm run check`                                                                                                                       | Next content tasks should add ResourceV2 effect builders and pilot the Absorption migration.                                                      |
| 2025-10-23                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/contents/src/resourceV2/index.ts; packages/contents/src/index.ts; packages/contents/tests/resourceV2-registry.test.ts; docs/project/resource-migration/production/production-living-docs.md                                                                                                         | Built ResourceV2 and ResourceGroup registries from the new builders, exported factory helpers, and added regression coverage for ordering, immutability, and parent/child constraints. | `npm run format`; `npm run lint`; `npm run check`                                                                                                                                                                   | Coordinate with engine and web owners to adopt the registries and expand ResourceV2 definitions (population roles, tier data) ahead of migration. |
| 2025-10-22                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/testing/src/factories/content.ts; packages/testing/src/factories/resourceV2.ts; packages/testing/tests/content-factory-resourceV2.test.ts; docs/project/resource-migration/production/production-living-docs.md                                                                                     |
| Added ResourceV2 factory helpers to testing content factory, ensured type re-exports for compatibility, and introduced focused ResourceV2 bounds/tier/order tests. | `npm run lint` (pass); `npm run check` (pass) |
| Monitor downstream test factories for ResourceV2 adoption needs and extend helper coverage if new inputs emerge.                                                   |
| 2025-10-22                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/engine/src/resourcesV2/types.ts; packages/engine/src/resourcesV2/index.ts; packages/engine/src/index.ts; packages/engine/tests/resourcesV2-types.test.ts; docs/project/resource-migration/production/production-living-docs.md                                                                      | Added runtime ResourceV2 metadata catalog with conversion utilities covering ordering, parent mapping, percent formatting, and tier payload preservation, plus targeted engine tests.  | `npm run check` (pass)                                                                                                                                                                                              | Coordinate engine effect handlers and UI consumers to adopt the runtime catalog in upcoming migration tasks.                                      |
| 2025-10-23                                                                                                                                                         | ChatGPT (gpt-5-codex)                         | packages/engine/src/state/index.ts; packages/engine/src/actions/context_clone.ts; packages/engine/tests/state-resourceV2.test.ts                                                                                                                                                                             | Added ResourceV2 player-state scaffolding (values, bounds, parents, touched flags, recent gain logs) plus clone support and regression coverage.                                       | `npm run check -- --filter engine` (fails: npm-run-all rejects `--filter`); `npm run check` (pass)                                                                                                                  | Finish wiring runtime catalog into engine bootstrap and migrate effect handlers/UI consumers onto helpers.                                        |
| 2024-**-**                                                                                                                                                         | _(add entry)_                                 |                                                                                                                                                                                                                                                                                                              |                                                                                                                                                                                        |                                                                                                                                                                                                                     |                                                                                                                                                   |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** ChatGPT (gpt-5-codex)
- **Timestamp (UTC):** 2025-10-23 20:15
- **Current Focus:** Engine ResourceV2 player-state scaffolding & helpers
- **State Summary:** Player state now allocates ResourceV2 value/bound maps, touched flags, parent trackers, and recent gain logs with helper APIs plus clone coverage; tests confirm initialization and cloning end-to-end. Full `npm run check` run is green.
- **Next Suggested Tasks:**
  - Integrate ResourceV2 catalog hydration into engine bootstrap so player states populate automatically from content.
  - Migrate engine effect handlers and UI consumers to the new ResourceV2 helper APIs while deprecating legacy fields.
- **Blocking Issues / Risks:** Filtered `npm run check -- --filter` remains unsupported; continue running the full suite until tooling improves.
- **Reminder:** Keep future migration work aligned with the helper APIs and update documentation as bootstrap wiring lands.

Each agent replaces this section when they finish their work so the next contributor immediately sees the latest situation. Move any longer-form discussion to the "Notes & Decisions" section.

## 5. Notes & Decisions Archive

Maintain a running list of important updates. Use subheadings with timestamps.

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
