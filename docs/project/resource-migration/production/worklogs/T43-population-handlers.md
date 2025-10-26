# Resource Migration MVP - P2 - T43 - Population Handlers ResourceV2 Sync

## Summary

- Added a shared `setPopulationRoleValue` helper that clamps target values, validates ResourceV2 catalog lookups, and preserves legacy population maps while writing through the ResourceV2 state pipeline.
- Updated the population add/remove handlers to rely on the helper so passive hooks only trigger when ResourceV2 values actually change, and so virtual parent resources cannot be mutated directly.
- Exposed PlayerState's population-to-resource mapping for engine callers and expanded the population effect test to assert ResourceV2 child and parent totals stay in sync.

## Touched Files

- packages/engine/src/effects/population_add.ts
- packages/engine/src/effects/population_remove.ts
- packages/engine/src/effects/population_resource.ts
- packages/engine/src/state/index.ts
- packages/engine/tests/effects/population.test.ts
- docs/project/resource-migration/production/worklogs/T43-population-handlers.md

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError during engine coverage run)_

## Follow-ups

- Backfill targeted coverage for population removal edge cases once the `developmentTarget` helper is restored so the full suite can execute without the existing contents failure.
