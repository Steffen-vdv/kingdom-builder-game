# Resource Migration MVP - P2 - T32 - Basic Actions ResourceV2 Migration

## Summary

- Replaced legacy happiness penalties in the core basic action set with ResourceV2 change payloads, removing `allowShortfall` and effect-level rounding metadata in favour of clamp-based reconciliation.
- Updated the Hold Festival fortification penalty to use the ResourceV2-aware stat builder so stat reductions honour the new reconciliation flow.

## Touched Files

- packages/contents/src/actions/basicActions.ts
- docs/project/resource-migration/production/worklogs/T32-basic-actions.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(fails: `developmentTarget` builder import is undefined during vitest bootstrap; see `npm run check` output for the TypeError surfaced from `happinessHelpers.ts`)_

## Follow-ups / Open Questions

- Confirm downstream engine handlers (once fully migrated to ResourceV2 payloads) continue to aggregate tax happiness penalties correctly without effect-level rounding metadata.
- Once transfer builders land in content, revisit Plunder to migrate its resource swaps to the ResourceV2 transfer payload helpers.
