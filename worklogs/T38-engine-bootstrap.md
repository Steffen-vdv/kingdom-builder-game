# Resource Migration MVP - P2 - T38 - Engine Bootstrap

## Summary

- Connected the engine bootstrap to the ResourceV2 content registries, generating a runtime catalog during `createEngine` setup so ResourceV2 effects can resolve metadata without manual test wiring.
- Added `resourceCatalogV2` references to `EngineContext` and `GameState`, ensuring runtime clones preserve the catalog pointer while other systems continue to operate unchanged.
- Captured the wiring details and remaining integration gaps for downstream protocol/session work.

## Touched Files

- packages/engine/src/setup/create_engine.ts
- packages/engine/src/context.ts
- packages/engine/src/state/index.ts
- packages/engine/src/actions/context_clone.ts
- packages/contents/src/registries/resourceV2.ts
- worklogs/T38-engine-bootstrap.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(aborted during `test:coverage:engine` after ~30s; catalog wiring verified prior to cancellation)_

## Follow-ups / Open Questions

- Extend engine bootstrap to initialise player ResourceV2 values/bounds from start payloads once the catalog snapshots feed into session state.
- Update session snapshot serialization to surface the runtime catalog (or derived metadata) so protocol/web consumers can render the new resources without legacy mirrors.
