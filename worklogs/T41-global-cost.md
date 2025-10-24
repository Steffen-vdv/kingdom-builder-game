# Resource Migration MVP - P2 - T41 - Global Action Cost Enforcement

## Summary

- Enforced global action cost discovery through the ResourceV2 catalog, mapping the flagged resource back to its legacy key and blocking non-system action overrides.
- Added EngineContext awareness of the global action cost amount so passive-modified cost calculations can apply the catalog value while respecting collector adjustments.
- Updated effect cost collectors to read ResourceV2 construction payloads and convert resource ids via the runtime catalog, keeping legacy building costs aligned with the new data source.

## Touched Files

- packages/engine/src/resource-v2/legacyMapping.ts
- packages/engine/src/setup/player_setup.ts
- packages/engine/src/setup/create_engine.ts
- packages/engine/src/context.ts
- packages/engine/src/actions/context_clone.ts
- packages/engine/src/actions/costs.ts
- packages/engine/src/effects/building_add.ts
- packages/engine/tests/actions/costs.behavior.test.ts

## Tests

- npm run format
- npm run lint
- npm run check _(aborted during `vitest` due to the pre-existing coverage stall; see chunk 7d50bc)_

## Follow-ups

- Investigate the long-running `vitest` coverage run noted in earlier worklogs so the `npm run check` pipeline can complete without manual interruption.
- Surface the global action cost amount in EngineContext snapshots when the session payload consumes ResourceV2 metadata.
- Audit content definitions to remove redundant legacy action point costs once downstream UI translations rely on the catalog metadata.
