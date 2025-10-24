# Resource Migration MVP - P2 - T38 - Engine bootstrap wiring

## Summary

- Engine bootstrap now builds the Runtime ResourceV2 catalog from the content registries (or game config override) and stores the shared reference on the `EngineContext` and `GameState`.
- `GameState`/`EngineContext` cloning preserves the catalog pointer so ResourceV2 handlers keep working inside cloned contexts (action previews, AI simulations, etc.).
- Session serialization inherits the same reference through the context, ensuring downstream systems can rely on `context.game.resourceCatalogV2` without rehydrating content.

## Follow-ups

- Wire `resourceCatalogV2` into session snapshots once the client transport is ready to ingest ResourceV2 metadata.
- Extend start configuration plumbing to seed ResourceV2 state (values, bounds, tiers) alongside the legacy resource/stat maps.
