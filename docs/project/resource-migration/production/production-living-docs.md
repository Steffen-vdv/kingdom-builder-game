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

| Date       | Agent                 | Scope / Files                                                                                                                                                                                                                                   | Summary of Work                                                                                                                                                                                              | Tests & Results                                                             | Follow-up Actions                                                                                                   |
| ---------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 2025-10-22 | ChatGPT (gpt-5-codex) | packages/contents/src/resourceV2/types.ts, packages/contents/src/resourceV2/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                      | Resource Migration MVP - P2 - T1 - Added ResourceV2 schema type scaffolding and documented follow-ups.                                                                                                       | _Not run (types only)_                                                      | Confirm schema assumptions for tier metadata and group parent scope.                                                |
| 2025-10-23 | ChatGPT (gpt-5-codex) | packages/contents/src/resourceV2/resourceBuilder.ts, packages/contents/src/resourceV2/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                            | Resource Migration MVP - P2 - T2 - Implemented chainable ResourceV2 builder with validation, exported API, and captured next steps for registry helpers.                                                     | _Not run (builder scaffolding)_                                             | Draft registry helper adapters to adopt the builder in upcoming tasks.                                              |
| 2025-10-24 | ChatGPT (gpt-5-codex) | packages/contents/src/resourceV2/groupBuilder.ts, packages/contents/src/resourceV2/registry.ts, packages/contents/src/resourceV2/index.ts, packages/contents/src/index.ts, docs/project/resource-migration/production/production-living-docs.md | Resource Migration MVP - P2 - T3 - Added ResourceV2 group builder and registry helpers with duplicate validation, exported APIs, and documented rollout.                                                     | npm run format; npm run lint; npm run check                                 | Coordinate adoption of registry helpers in content packages and plan first migrated resource entry.                 |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/protocol/src/resource-v2/types.ts, packages/protocol/src/resource-v2/index.ts, packages/protocol/src/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                    | Resource Migration MVP - P2 - T12 - Added ResourceV2 protocol payload types and exported them for downstream consumers, keeping parity with runtime schema.                                                  | npm run format; npm run lint; npm run check                                 | Extend session contracts to surface ResourceV2 registries and payload structures.                                   |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/contents/tests/resourceV2/resourceV2Builders.test.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                                             | Resource Migration MVP - P2 - T4 - Added ResourceV2 builder and group registry tests covering happy paths, duplicate setters, bounds validation, and cost safeguards, then documented outstanding questions. | npm run test --workspace @kingdom-builder/contents (pass; see chunk 55968c) | Audit bounds() helper interactions with pre-set limits and validate multi-resource global cost authoring scenarios. |
| 2025-10-25 | ChatGPT (gpt-5-codex) | packages/testing/src/factories/resourceV2.ts, packages/testing/src/index.ts, docs/project/resource-migration/production/production-living-docs.md                                                                                               | Resource Migration MVP - P2 - T14 - Introduced ResourceV2 testing factories wrapping builders with override support and registry materialisers, plus documentation updates.                                  | npm run format; npm run lint; npm run check                                 | Integrate helpers into engine/protocol suites and expand coverage once first migrated resource lands.               |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** ChatGPT (gpt-5-codex)
- **Timestamp (UTC):** 2025-10-25 15:30
- **Current Focus:** Resource Migration MVP - P2 - T14 - Stand up ResourceV2 testing utilities for registries
- **State Summary:** Added testing helpers that wrap the ResourceV2 builders to quickly author resource and group definitions with metadata, bounds, tier, and global cost overrides, plus a registry materialiser that mirrors production ordering. Exported the helpers via `@kingdom-builder/testing` and documented usage in this living doc. Validation to ensure parent overrides merge correctly happens post-build to retain builder invariants. Tests (`npm run format`, `npm run lint`, `npm run check`) verified the change set.
- **Next Suggested Tasks:**
  - Adopt the new testing helpers inside engine and protocol suites to replace bespoke resource fixtures (Owner: Engine/Protocol).
  - Draft an example Absorption migration test case leveraging the factories to validate first-tier transitions (Owner: Content/Test).
- **Blocking Issues / Risks:** Awaiting alignment on where the testing registries should plug into existing session factory helpers; coordination needed to avoid duplicated setup paths.
- **Reminder:** First ResourceV2 migration should target **Absorption** because it is a small, low-risk stat that exercises the pipeline without touching population flows.

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
