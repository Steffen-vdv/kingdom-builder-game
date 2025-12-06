# Resource Migration Project – Agent Instructions

## Required Reading

Before starting any task in the **Resource Migration** project:

1. Read every document in [`docs/project/resource-migration/pre-production/`](../pre-production/):
   - `project-outline.md`
   - `design-document.md`
   - `project-definition.md`
2. Review the living project status in [`production-living-docs.md`](./production-living-docs.md).

You are expected to understand the full context, decisions, and rationale captured in these documents **before** you begin working. Lack of awareness is not an acceptable excuse for misaligned implementations.

## Mandatory Updates

After completing your task:

1. Add a status update to the "Work Log" table in `production-living-docs.md` describing what you changed, tests executed, and any follow-up actions.
2. Provide a clear handover note in the "Latest Handover" section of `production-living-docs.md` so the next agent immediately knows the project state and next priorities.
3. If your work introduces intended temporary regressions or TODO markers, record them explicitly in the living doc.
   3.1. **Do not skip Section 6 – Intended Temporary Regressions.** Every intentional test failure or other breakage must be logged there with resolution expectations before you finish the task. Missing these notes is grounds for task rejection. Confirm the table still reflects the current state before you wrap up the task and again before invoking `make_pr`.

## Enforcement

Tasks that omit any of the steps above will be rejected. Agents who do not acknowledge the project context or fail to document their handover will block the project’s progress.
