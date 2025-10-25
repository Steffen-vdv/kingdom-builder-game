# Resource Migration MVP - P2 - T42 - Effect Registry ResourceV2 Wiring

## Summary

- Pointed the core effect registry to the ResourceV2 add/remove/transfer/upper-bound handlers so runtime execution flows
  through the migrated pipeline.
- Pruned legacy resource handler imports from the registry entry module to avoid accidentally re-registering deprecated logic.
- Re-exported the ResourceV2 handler symbols from the effect index for downstream modules/tests.

## Touched Files

- packages/engine/src/effects/index.ts
- docs/project/resource-migration/production/worklogs/T42-effect-registry.md

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError during engine coverage run)_

## Follow-ups

- Backfill any remaining legacy resource effect tests to exercise the ResourceV2 handler contract directly once the new
  parameter builders ship across all content packages.
