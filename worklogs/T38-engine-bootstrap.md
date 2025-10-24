# Resource Migration MVP - P2 - T38 - Engine Bootstrap Catalog Wiring

## Summary

- Engine bootstrap now imports the canonical ResourceV2 and group registries from `@kingdom-builder/contents`, translating them into the runtime catalog through `createRuntimeResourceCatalog` so engine services share the same ordering and metadata as content.
- Game configuration overrides can swap in a pre-validated ResourceV2 snapshot, enabling protocol-driven sessions to seed experimental catalogs without bypassing runtime validation.
- The runtime catalog is stored on both `EngineContext` and `GameState`, with cloning paths forwarding the reference to keep ResourceV2 effects and tests aligned when contexts are duplicated.

## Follow-up Considerations

- Propagate the runtime catalog through any session serialisation or networking payloads once those surfaces begin exposing ResourceV2 data to clients.
- Audit existing tests that manually construct `EngineContext` instances to ensure they attach a catalog before exercising ResourceV2 handlers.
