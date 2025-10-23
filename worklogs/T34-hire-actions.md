# Resource Migration MVP - P2 - T34 - Hire Actions ResourceV2 Migration

## Summary

- Refactored the hire action registry builder to use shared configuration for each population role, emitting ResourceV2-aware happiness change payloads alongside the population add effect.
- Ensured the refactor preserves the population capacity requirement wiring by reusing the existing evaluator configuration and verifying population role lookups against the POPULATIONS registry helpers.
- Audited the population assignment passives to confirm their existing ResourceV2 builders already surface change payloads, so no additional passive hooks were required in this task.

## Touched Files

- packages/contents/src/actions/hireActions.ts
- worklogs/T34-hire-actions.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(fails: repository typecheck still expects prebuilt dist artifacts)_

## Follow-ups / Open Questions

- None.
