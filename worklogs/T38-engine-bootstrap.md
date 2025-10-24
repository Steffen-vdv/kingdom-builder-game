# Resource Migration MVP - P2 - T38 - Engine Bootstrap

## Summary

- Engine bootstrap now consumes the ResourceV2 registries from `@kingdom-builder/contents`, applies any `resourceCatalogV2` overrides from developer configs, and produces a frozen runtime catalog for the session.
- The runtime catalog is wired onto both `GameState` and `EngineContext`, with cloning helpers forwarding the shared reference so ResourceV2 handlers can rely on it during deep copies and simulation snapshots.

## Notes

- The runtime catalog intentionally remains a shared reference (no structured clone) because it is immutable; downstream ResourceV2 helpers expect pointer equality between the context and game state during calculations.
- Future tasks that surface ResourceV2 player values through snapshots should reuse the attached catalog rather than rebuilding it to avoid mismatched ordering/group metadata between engine and protocol payloads.
