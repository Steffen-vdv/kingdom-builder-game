# Resource Migration MVP - P2 - T35 - Passive Content ResourceV2 Migration

## Summary

- Migrated building registry resource and stat adjustments to use `resourceChange` with ResourceV2 ids instead of legacy `resourceParams` / `statParams` helpers.
- Updated development definitions to emit ResourceV2 change payloads for income and stat rewards while keeping evaluator wiring intact.
- Confirmed no passive or modifier metadata required refactoring beyond the existing ResourceV2-compatible stubs.

## Touched Files

- packages/contents/src/buildings.ts
- packages/contents/src/developments.ts
- worklogs/T35-passive-content.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check`

## Follow-ups / Open Questions

- None.
