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

| Date       | Agent         | Scope / Files                                                                                             | Summary of Work                                                          | Tests & Results                             | Follow-up Actions                                                             |
| ---------- | ------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------- |
| 2024-**-** | _(add entry)_ |                                                                                                           |                                                                          |                                             |                                                                               |
| 2025-10-22 | gpt-5-codex   | packages/contents/src/resourceV2/\*, docs/project/resource-migration/production/production-living-docs.md | Added ResourceV2 schema types, exports, and documented handover context. | npm run format, npm run lint, npm run check | Confirm builder API coverage and clarify global cost validation expectations. |

Append new rows chronologically (most recent at the bottom). Include command outputs or references to terminal chunks when relevant.

## 4. Latest Handover (overwrite each task)

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-22 15:11
- **Current Focus:** ResourceV2 schema scaffolding in the contents package so downstream teams can begin consuming the new definitions.
- **State Summary:** Introduced the foundational TypeScript types for ResourceV2 metadata, tiering, global cost flags, and group definitions, with exports surfaced through the contents entry point. No builder or registry wiring exists yet, so legacy systems remain active while downstream consumers can plan migrations. Outstanding design clarifications include how global cost validation should surface and whether additional tier metadata is required for UI renderers.
- **Next Suggested Tasks:**
  - Implement ResourceV2 builders and registry loaders aligned with the new schema (owner TBD).
  - Draft protocol serialization updates that emit ResourceV2 metadata for client consumption (owner TBD).
- **Blocking Issues / Risks:**
  - Need confirmation on the expected shape of the `globalCost` configuration (e.g., whether future reconciliation flags or multi-resource support should be anticipated in the type definitions).
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
