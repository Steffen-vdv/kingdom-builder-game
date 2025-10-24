# Resource Migration Project – Production Living Document

This document captures the evolving state of the Resource Migration initiative. Every agent **must** read the entire file before making changes. Task-level updates now live in dedicated Markdown files under [`./worklogs/`](./worklogs/) (see directory README for the required template); do **not** edit the shared Work Log table directly. Instead, create a new per-task file, reference it in your handover notes, and allow the designated aggregator to merge highlights back into the table.

## 1. Quick Context

- **Project Name:** Resource Migration (ResourceV2 unification)
- **Goal:** Replace legacy resource/stat/population systems with the unified ResourceV2 platform across engine, content, protocol, and web.
- **Current Phase:** Planning bootstrap – documentation and project scaffolding.

## 2. High-Level Status Snapshot

| Area         | Current State   | Owner | Notes                                                                                         |
| ------------ | --------------- | ----- | --------------------------------------------------------------------------------------------- |
| Engine       | _TBD_           | –     | Pending implementation plan.                                                                  |
| Content      | Nearing handoff | –     | Resource catalog, start payloads, and content actions now emit ResourceV2 metadata (T18–T36). |
| Protocol/API | _TBD_           | –     | Awaiting design sign-off.                                                                     |
| Web UI       | _TBD_           | –     | Pending migration strategy.                                                                   |
| Testing      | _TBD_           | –     | Unified test plan not started.                                                                |

Update the table whenever a domain meaningfully changes. Keep comments concise and reference sections below for detail.

## 3. Work Log (append-only)

> ⚠️ Parallel contributors: keep this table stable. Add your notes to [`./worklogs/`](./worklogs/) and notify the aggregator via the Latest Handover section so they can roll the details forward without risking merge conflicts.

| Date       | Agent                 | Scope / Files                                                                                                                                                                                                                                                                      | Summary of Work                                                                                                                                                                                                                               | Tests & Results                                                                                            | Follow-up Actions                                                                                                                      |
| ---------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-10-22 | ChatGPT (gpt-5-codex) | packages/contents/src/resourceV2/types.ts, packages/contents/src/resourceV2/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                                         | Resource Migration MVP - P2 - T1 - Added ResourceV2 schema type scaffolding and documented follow-ups.                                                                                                                                        | _Not run (types only)_                                                                                     | Confirm schema assumptions for tier metadata and group parent scope.                                                                   |
| 2025-10-23 | ChatGPT (gpt-5-codex) | packages/contents/src/resourceV2/resourceBuilder.ts, packages/contents/src/resourceV2/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                               | Resource Migration MVP - P2 - T2 - Implemented chainable ResourceV2 builder with validation, exported API, and captured next steps for registry helpers.                                                                                      | _Not run (builder scaffolding)_                                                                            | Draft registry helper adapters to adopt the builder in upcoming tasks.                                                                 |
| 2025-10-24 | ChatGPT (gpt-5-codex) | packages/contents/src/resourceV2/groupBuilder.ts, packages/contents/src/resourceV2/registry.ts, packages/contents/src/resourceV2/index.ts, packages/contents/src/index.ts, docs/project/resource-migration/production/production-living-docs.md                                    | Resource Migration MVP - P2 - T3 - Added ResourceV2 group builder and registry helpers with duplicate validation, exported APIs, and documented rollout.                                                                                      | npm run format; npm run lint; npm run check                                                                | Coordinate adoption of registry helpers in content packages and plan first migrated resource entry.                                    |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/protocol/src/resource-v2/types.ts, packages/protocol/src/resource-v2/index.ts, packages/protocol/src/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                       | Resource Migration MVP - P2 - T12 - Added ResourceV2 protocol payload types and exported them for downstream consumers, keeping parity with runtime schema.                                                                                   | npm run format; npm run lint; npm run check                                                                | Extend session contracts to surface ResourceV2 registries and payload structures.                                                      |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/contents/tests/resourceV2/resourceV2Builders.test.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                                                                | Resource Migration MVP - P2 - T4 - Added ResourceV2 builder and group registry tests covering happy paths, duplicate setters, bounds validation, and cost safeguards, then documented outstanding questions.                                  | npm run test --workspace @kingdom-builder/contents (pass; see chunk 55968c)                                | Audit bounds() helper interactions with pre-set limits and validate multi-resource global cost authoring scenarios.                    |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/engine/src/resource-v2/types.ts, packages/engine/src/resource-v2/content-types.ts, packages/engine/src/resource-v2/fromContent.ts, packages/engine/src/resource-v2/index.ts, docs/project/resource-migration/production/production-living-docs.md                         | Resource Migration MVP - P2 - T5 - Added runtime ResourceV2 catalog types, converter with MVP validation/defaulting, and documented pending integration tasks.                                                                                | npm run format; npm run lint; npm run check                                                                | Wire runtime catalog into engine bootstrap, finish converter tests, and confirm check pipeline in follow-up tasks.                     |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/testing/src/factories/resourceV2.ts, packages/testing/src/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                                                  | Resource Migration MVP - P2 - T14 - Introduced ResourceV2 testing factories wrapping builders with override support and registry materialisers, plus documentation updates.                                                                   | npm run format; npm run lint; npm run check                                                                | Integrate helpers into engine/protocol suites and expand coverage once first migrated resource lands.                                  |
| 2025-10-26 | ChatGPT (gpt-5-codex) | packages/protocol/src/session/contracts.ts, packages/protocol/src/session/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                                           | Resource Migration MVP - P2 - T13 - Added optional ResourceV2 session contract fields (registries, player valuesV2, metadata mirrors) and documented their placeholder status.                                                                | npm run format; npm run lint; npm run check (partial – aborted during web suite due to duration)           | Wire server/session transports to populate the new ResourceV2 fields and rerun full check once wiring lands.                           |
| 2025-10-26 | ChatGPT (gpt-5-codex) | packages/engine/src/state/index.ts, packages/engine/src/actions/context_clone.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                                             | Resource Migration MVP - P2 - T6 - Added PlayerState scaffolding for ResourceV2 values, bounds, tier tracking, and touched flags while keeping legacy Resource/Stat wiring intact, then updated cloning to preserve the new maps.             | npm run format; npm run lint; npm run check                                                                | Plan follow-up wiring to seed ResourceV2 maps from runtime registries and surface them in snapshots once live data hooks in.           |
| 2025-10-26 | ChatGPT (gpt-5-codex) | packages/engine/src/resource-v2/reconciliation.ts, packages/engine/src/resource-v2/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                                  | Resource Migration MVP - P2 - T8 - Added reconciliation utilities that compute static/percent deltas with configurable rounding, clamp against bounds, export shared types, and documented remaining wiring steps.                            | npm run format; npm run lint; npm run check                                                                | Wire helpers into resource effect handlers and author targeted rounding/clamp unit tests.                                              |
| 2025-10-26 | ChatGPT (gpt-5-codex) | packages/web/src/translation/resourceV2/formatters.ts, packages/web/src/translation/resourceV2/index.ts, packages/web/src/translation/index.ts, packages/web/tests/translation/resourceV2/formatters.test.ts, docs/project/resource-migration/production/production-living-docs.md | Resource Migration MVP - P2 - T15 - Added ResourceV2 translation helpers that turn metadata/value snapshots into summaries, hover sections, and Option A signed gain entries, exported them for reuse, and covered the pure logic with tests. | npm run format; npm run lint; npm run check                                                                | Wire helpers into the web UI once ResourceV2 values surface in session snapshots and log wiring begins.                                |
| 2025-10-27 | ChatGPT (gpt-5-codex) | packages/engine/tests/resource-v2/state-helpers.test.ts, packages/engine/tests/resource-v2/effects-handlers.test.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                          | Resource Migration MVP - P2 - T11 - Authored ResourceV2 state helper and handler tests covering clamp rounding, tier tracking, touched/bound flags, signed logging, and transfer options using runtime catalogs from the new converters.      | npx vitest run --config vitest.engine.config.ts packages/engine/tests/resource-v2 (pass; see chunk be9f1f) | Backfill tier-transition coverage for mixed transfers and parent bound changes once runtime catalog wiring reaches the engine context. |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** ChatGPT (gpt-5-codex)
- **Timestamp (UTC):** 2025-10-28 15:30
- **Current Focus:** Resource Migration MVP - P2 - T41 - Global Action Cost Enforcement
- **State Summary:** Engine setup now resolves the primary action-cost resource directly from the ResourceV2 catalog, records the configured amount on the context, and rejects per-action overrides (including collector contributions). Legacy intersection logic still backstops scenarios without a global flag. See [`worklogs/T41-global-cost.md`](../../../../worklogs/T41-global-cost.md) for implementation notes, updated test coverage, and follow-up items.
- **Next Suggested Tasks:**
  - Audit content builders/fixtures to remove explicit Action Point costs so catalog enforcement remains authoritative.
  - Thread the resolved global cost amount through session snapshots or metadata payloads if clients need to display the configured value without inferring it from the catalog.
  - Stabilise `npm run check` by resolving the longstanding `developmentTarget()` TypeError raised during engine coverage before broadening automated enforcement.
- **Blocking Issues / Risks:** `npm run check` still aborts with `TypeError: (0 , developmentTarget) is not a function` from `packages/contents/src/happinessHelpers.ts`. The regression predates this task; resolution is required before enforcing ResourceV2 changes repository-wide.
- **Reminder:** Continue logging work in per-task files and coordinate catalog rollouts so downstream teams can update UI/translation layers against the new global cost contract.

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
