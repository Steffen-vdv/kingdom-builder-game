# Resource Migration MVP - P2 - T48 - Engine cleanup of legacy resource accessors

## Summary

- Normalised legacy resource, stat, and population reads to go through ResourceV2 identifiers across engine snapshots, logging, developer presets, and trigger harvesting.
- Updated resource manipulation handlers (add, remove, transfer, and population effects) to write via the ResourceV2 helpers while keeping safe fallbacks for pre-migration sessions.
- Simplified player cloning utilities so legacy maps hydrate from ResourceV2 getters, eliminating direct access to `player.resources`, `player.stats`, and `player.population`.

## Touched Files

- docs/project/resource-migration/production/production-living-docs.md
- docs/project/resource-migration/production/worklogs/T48-engine-cleanup.md
- packages/engine/src/actions/context_clone.ts
- packages/engine/src/effects/population_add.ts
- packages/engine/src/effects/population_remove.ts
- packages/engine/src/effects/population_resource.ts
- packages/engine/src/effects/resource_add.ts
- packages/engine/src/effects/resource_remove.ts
- packages/engine/src/effects/resource_transfer.ts
- packages/engine/src/log.ts
- packages/engine/src/runtime/developer_preset.ts
- packages/engine/src/runtime/player_snapshot.ts
- packages/engine/src/triggers.ts

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError in `packages/contents/src/happinessHelpers.ts` during repository check)_

## Follow-ups

- Convert outstanding engine services (win conditions, tier helpers, etc.) to consume ResourceV2 ids exclusively.
- Audit effect registries for any lingering direct writes to `player.population`, queuing cleanups where fallbacks remain.
- Re-run `npm run check` after the `developmentTarget` regression is resolved to validate the ResourceV2 setters against the full suite.
