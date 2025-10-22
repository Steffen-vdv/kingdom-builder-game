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

| Date       | Agent                 | Scope / Files                                                                                                                                                                                                                                                                                                                                                                                                                                    | Summary of Work                                                                                                                                                                                 | Tests & Results                                                                                                                                                                                                                                                 | Follow-up Actions                                                                                                                                                                         |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-10-22 | ChatGPT (gpt-5-codex) | packages/protocol/src/config/resourceV2.ts; packages/protocol/src/config/schema.ts; packages/protocol/tests/resourceV2-schema.test.ts; docs/project/resource-migration/production/production-living-docs.md                                                                                                                                                                                                                                      | Added ResourceV2 schema/module exports plus validation tests for ResourceV2 payloads.                                                                                                           | `npx tsc -p packages/protocol/tsconfig.json --pretty false` (pass); `npx vitest run --config vitest.protocol.config.ts` (pass)                                                                                                                                  | Draft protocol payload integration plan building on new schema artifacts.                                                                                                                 |
| 2025-10-22 | ChatGPT (gpt-5-codex) | packages/protocol/src/effects.ts; packages/protocol/src/config/effect_schemas.ts; packages/protocol/tests/config-schema.test.ts; packages/engine/src/services/passive_types.ts; packages/engine/src/services/cost_modifier_service.ts; packages/engine/src/services/evaluation_modifier_service.ts; packages/engine/tests/effects/resource-transfer-percent-bounds.test.ts; docs/project/resource-migration/production/production-living-docs.md | Extended effect definitions and schemas with rounding, reconciliation, and hook suppression metadata; synchronized engine rounding support and added regression coverage for new rounding mode. | `npx tsc -p packages/protocol/tsconfig.json --pretty false` (pass); `npx vitest run --config vitest.protocol.config.ts` (pass); `npx vitest run packages/engine/tests/effects/resource-transfer-percent-bounds.test.ts --config vitest.engine.config.ts` (pass) | Evaluate broader engine/service coverage for `'nearest'` rounding in modifier/evaluator call sites and consider narrower protocol-only check workflow to avoid long repository-wide runs. |
| 2024-**-** | _(add entry)_         |                                                                                                                                                                                                                                                                                                                                                                                                                                                  |                                                                                                                                                                                                 |                                                                                                                                                                                                                                                                 |                                                                                                                                                                                           |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** ChatGPT (gpt-5-codex)
- **Timestamp (UTC):** 2025-10-22 15:57
- **Current Focus:** Effect metadata parity across protocol and engine
- **State Summary:** Added optional `round: 'up' | 'down' | 'nearest'`, reconciliation strategies, and hook suppression flags to protocol effect definitions with Zod validation, mirrored rounding support within engine cost/evaluation modifier services, and added regression coverage for `'nearest'` behaviour and effect schema acceptance. Targeted protocol typecheck/tests and the resource transfer engine test pass (`npx tsc -p packages/protocol/tsconfig.json --pretty false`, `npx vitest run --config vitest.protocol.config.ts`, `npx vitest run packages/engine/tests/effects/resource-transfer-percent-bounds.test.ts --config vitest.engine.config.ts`).
- **Next Suggested Tasks:**
  - Audit remaining engine and content pipelines for implicit assumptions about `'up' | 'down'` rounding to ensure `nearest` never causes unintended truncation.
  - Extend modifier reconciliation handling in engine services to respect new protocol `reconciliation` metadata once design finalizes expected behaviours.
- **Blocking Issues / Risks:** Running `npm run check -- --filter protocol` triggers full-repo checks; rely on targeted `tsc`/`vitest` commands until scoped check support exists.
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
