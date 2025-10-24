# Resource Migration MVP - P2 - T38 - Engine Bootstrap

## Summary

- Bootstrapped the engine with the ResourceV2 runtime catalog produced from the content registries (or GameConfig overrides) and ensured both `EngineContext` and `GameState` publish the shared instance.
- Propagated the runtime catalog reference through cloning and snapshot serialization so downstream systems can observe the same immutable object without rehydration.

## Wiring Notes

- `createEngine` now accepts a `resourceCatalogV2` payload via options, converts any `GameConfig` snapshot override with `convertResourceCatalogSnapshot`, and builds the runtime catalog through `createRuntimeResourceCatalog`.
- The runtime catalog instance is assigned directly to `EngineContext.resourceCatalogV2` and `GameState.resourceCatalogV2`, letting effect handlers and other services work against the prepared structure.
- `cloneEngineContext`, `cloneGameState`, and `snapshotEngine` pass the catalog reference through unchanged, and the session contract exposes the structure via `SessionResourceCatalogV2`.

## Follow-ups

- Confirm whether player initialization should pre-populate ResourceV2 value/state bags during bootstrap once the new resource payloads replace the legacy keys.
- Coordinate with web/session consumers to begin reading `game.resourceCatalogV2` from snapshots and retire duplicated catalog assembly logic.
