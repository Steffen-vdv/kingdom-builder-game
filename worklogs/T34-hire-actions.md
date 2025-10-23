# Resource Migration MVP - P2 - T34 - Hire Actions ResourceV2 Migration

## Summary

- Added reusable happiness change metadata that emits ResourceV2 payloads alongside existing hire action effects so downstream consumers can reason about hire-related morale swings.
- Attached the new happiness change payloads to population add parameters for each hire action, confirming population evaluator lookups remain bound to their roles.

## Touched Files

- packages/contents/src/actions/hireActions.ts
- worklogs/T34-hire-actions.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(aborted after confirming typecheck kicked off; full suite still blocked on long-running coverage + known dist-artifact build gap)_

## Follow-ups

- Coordinate with engine consumers to read the new `happinessChanges` metadata before removing legacy happiness adjustments.
- Audit hire-related passives once ResourceV2 change hooks land in engine handlers to ensure suppressHooks semantics stay correct.
