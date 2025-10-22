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

| Task ID                           | Date       | Agent         | Scope / Files                                                        | Summary of Work                                                                                                                                      | Tests & Results | Follow-up Actions                                                                                          |
| --------------------------------- | ---------- | ------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| Resource Migration MVP - P3 - T1  | 2025-10-22 | gpt-5-codex   | docs/project/resource-migration/production/production-living-docs.md | Established 30 task-specific placeholder rows, documented the overwrite protocol, and refreshed the handover baseline for the production living doc. | `npm run lint`  | Future agents should update only their assigned task row and note progress in the Latest Handover section. |
| Resource Migration MVP - P3 - T2  | 2025-10-22 | gpt-5-codex   | packages/protocol/src/index.ts; packages/protocol/src/resourceV2.ts  | Established ResourceV2 definition/group schemas, registry payload, and validation tests.                                                             | `npm run lint`  | None                                                                                                       |
| Resource Migration MVP - P3 - T3  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T3 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T4  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T4 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T5  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T5 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T6  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T6 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T7  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T7 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T8  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T8 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T9  | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T9 assignee – update only this row.)_                                                                                                 |                 |                                                                                                            |
| Resource Migration MVP - P3 - T10 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T10 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T11 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T11 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T12 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T12 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T13 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T13 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T14 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T14 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T15 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T15 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T16 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T16 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T17 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T17 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T18 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T18 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T19 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T19 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T20 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T20 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T21 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T21 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T22 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T22 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T23 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T23 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T24 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T24 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T25 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T25 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T26 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T26 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T27 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T27 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T28 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T28 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T29 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T29 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |
| Resource Migration MVP - P3 - T30 | 2025-**-** | _(add entry)_ |                                                                      | _(reserved for T30 assignee – update only this row.)_                                                                                                |                 |                                                                                                            |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-22 15:11
- **Current Focus:** Resource Migration MVP - P3 - T2 protocol schema scaffolding
- **State Summary:** ResourceV2 metadata and registry schemas now live in protocol with coverage for bounds reconciliation, tier tracks, group parents, and signed recent gain entries. Tests confirm happy-path parsing and representative validation failures, and lint/test suites pass, keeping downstream packages unblocked for registry integration.
- **Next Suggested Tasks:**
  - Finalise engine/resource registry wiring to consume the new ResourceV2 protocol shapes.
  - Draft content builder updates that emit ResourceV2 definitions matching the protocol contract.
- **Blocking Issues / Risks:** None

- **Timestamp (UTC):** 2025-10-22 00:00
- **Current Focus:** Finalizing planning scaffolds so that Phase 3 execution tasks can progress without document collisions.
- **State Summary:** The production living doc now contains 30 pre-seeded work-log rows aligned to Resource Migration MVP - P3 task IDs. Each future assignee must update only the row that matches their task identifier and leave other placeholders intact. Planning remains in bootstrap mode; implementation work has not yet started, and domain status tables above are still TBD.
- **Next Suggested Tasks:**
  - Populate the appropriate work-log row after completing each P3 task, noting scope, test evidence, and follow-ups.
  - Begin outlining domain-specific migration plans once ownership is assigned (Engine, Content, Protocol/API, Web, Testing).
- **Blocking Issues / Risks:** None at this time. The primary risk is accidental overwrites—mitigated by the placeholder-row protocol documented here and in the Notes & Decisions Archive.
- **Reminder:** First ResourceV2 migration should target **Absorption** because it is a small, low-risk stat that exercises the pipeline without touching population flows.

Each agent replaces this section when they finish their work so the next contributor immediately sees the latest situation. Move any longer-form discussion to the "Notes & Decisions" section.

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
