# Resource Migration MVP - P2 - T39 - PlayerState Resource Proxies

## Summary

- Refactored `PlayerState` to store canonical numeric values in `resourceValues` and expose legacy `resources`, `stats`, and `population` maps through getters/setters that proxy to the ResourceV2-backed data.
- Added runtime catalog synchronisation helpers so dynamic property definitions stay aligned with available ResourceV2 entries and keep `GameState.resourceCatalogV2` updates in sync.

## Touched Files

- packages/engine/src/state/index.ts

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(in progress during this task; see console log for status)_

## Follow-ups

- Confirm downstream systems that consume `player.resourceValues` are ready for legacy proxies to rely solely on ResourceV2 IDs once catalog wiring feeds canonical keys.
- Revisit whether `statsHistory` and other legacy maps should migrate to ResourceV2 identifiers after the proxy phase stabilises.
