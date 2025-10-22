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

| Date       | Agent       | Scope / Files                                                                                                                                                                                                                               | Summary of Work                                                                                                                                                      | Tests & Results                                                                                                                                                     | Follow-up Actions                                                                                                                        |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-10-22 | gpt-5-codex | packages/protocol/src/config/resourceV2.ts; packages/protocol/src/config/schema.ts; packages/protocol/src/index.ts; packages/protocol/tests/resourceV2-schema.test.ts; docs/project/resource-migration/production/production-living-docs.md | Introduced ResourceV2 configuration schemas (definitions, tier tracks, groups, reconciliation metadata) with new tests and exports. Updated living doc with results. | `npx tsc -p packages/protocol/tsconfig.json`; `npx vitest run --config vitest.protocol.config.ts` 【00f3b8†L1-L2】【5f0cc1†L1-L1】【abd5cd†L1-L2】【9a47c5†L1-L18】 | Monitor downstream consumers for schema integration needs; plan follow-up for engine/content adoption and additional validator coverage. |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-22 15:16
- **Current Focus:** ResourceV2 protocol schema scaffolding and validation fixtures.
- **State Summary:** Established new Zod schemas covering ResourceV2 definitions, tier tracks, group parents, rounding modes, reconciliation policies, hook suppression, and global action cost metadata. Re-exported these surfaces for consumers and added targeted tests that exercise valid/invalid payloads. Repository-wide `npm run check -- --filter protocol` is not supported by the current npm-run-all version, so protocol-specific typecheck (`npx tsc -p packages/protocol/tsconfig.json`) and vitest suite (`npx vitest run --config vitest.protocol.config.ts`) were executed to confirm the additions.【00f3b8†L1-L2】【5f0cc1†L1-L1】【abd5cd†L1-L2】【9a47c5†L1-L18】
- **Next Suggested Tasks:**
  - Draft engine/content integration plan for consuming the new ResourceV2 schemas (owner: TBD).
  - Extend builder/runtime validations to leverage reconciliation and hook suppression metadata once engine support lands (owner: TBD).
- **Blocking Issues / Risks:** `npm run check -- --filter protocol` currently fails with `Invalid Option: --filter`; coordinating with tooling maintainers may be necessary if repo-level automation expects that flag.【4c4fed†L1-L5】
- **Reminder:** First ResourceV2 migration should target **Absorption** because it is a small, low-risk stat that exercises the pipeline without touching population flows.

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
