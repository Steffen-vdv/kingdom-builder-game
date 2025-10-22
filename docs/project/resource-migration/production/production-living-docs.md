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

## 3. Work Logs (domain-specific, append-only)

All historical updates now live in domain-specific work log files. Append a dated entry to every domain you touched during a task.

| Domain        | Work Log                                         |
| ------------- | ------------------------------------------------ |
| Content       | [content.md](./work-logs/content.md)             |
| Engine        | [engine.md](./work-logs/engine.md)               |
| Protocol/API  | [protocol.md](./work-logs/protocol.md)           |
| Web UI        | [web.md](./work-logs/web.md)                     |
| Testing       | [testing.md](./work-logs/testing.md)             |
| Documentation | [documentation.md](./work-logs/documentation.md) |

Entries remain append-only (most recent at the bottom). Reference command output chunks when relevant and keep summaries concise but traceable.

## 4. Latest Handovers (domain-specific, overwrite on completion)

Use the per-domain handover template that matches the work you completed. Replace the entire file before you wrap up so the next agent inherits an actionable snapshot.

| Domain        | Handover Template                               |
| ------------- | ----------------------------------------------- |
| Content       | [content.md](./handover/content.md)             |
| Engine        | [engine.md](./handover/engine.md)               |
| Protocol/API  | [protocol.md](./handover/protocol.md)           |
| Web UI        | [web.md](./handover/web.md)                     |
| Testing       | [testing.md](./handover/testing.md)             |
| Documentation | [documentation.md](./handover/documentation.md) |

Each file should hold only the latest context for that domain. Move extended discussion or rationale to the "Notes & Decisions" section as needed.

**Reminder:** The first ResourceV2 migration should still target **Absorption** because it is a small, low-risk stat that exercises the pipeline without touching population flows.

## 5. Notes & Decisions Archive

Maintain a running list of important updates. Use subheadings with timestamps.

### 2024-**-** – Initial scaffolding

- Placeholder: replace with summary when real work starts.
- Recommended first migration target: **Absorption** (selected for its limited integrations and low risk while still covering stat-specific behaviours).

### 2024-**-** – MVP scope alignment

- MVP delivery is limited to clamp-based reconciliation, parented ResourceGroups, mandatory add/remove/transfer/upper-bound increase effects, percent modifiers, the hook-suppression escape hatch, a single global action cost resource, unified HUD/translations, and signed gain/loss logging (Option A). All other features stay on the backlog for later phases.
- Deferred items (value/bound breakdown capture, additional bound adjusters, Pass/Reject reconciliation, parentless groups, bound-decrease effects, comprehensive validators, tier-based shortfall replacement, extra global cost resources) are tracked in [Deferred (Post-MVP) Work](../pre-production/project-outline.md#5-deferred-post-mvp-work). Do not reintroduce these during daily task triage.
- Phase summaries must log both gains and losses in `recentResourceGains` (Option A) so stakeholders can audit negative swings without waiting for the backlog enhancements.

### 2025-10-22 – Domain-specific logging rollout

- Split the production work log and handover process into per-domain files under `production/work-logs/` and `production/handover/` for clarity.
- Updated the living document and agent instructions to direct contributors toward the new structure.

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
