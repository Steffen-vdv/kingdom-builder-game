# Resource Migration MVP - P2 - T62 - ResourceV2 contract hardening

## Summary

- Made ResourceV2 registries, values, bounds, and catalogs required across session contracts and runtime transports, ensuring every snapshot and registry payload includes the unified data.
- Updated engine, web translation contexts, server transports, and fixtures/tests to rely on the always-present ResourceV2 structures while documenting the completion of the payload hardening.

## Touched Files

- packages/protocol/src/session/contracts.ts
- packages/protocol/src/session/index.ts
- packages/engine/src/runtime/engine_snapshot.ts
- packages/engine/src/runtime/player_snapshot.ts
- packages/engine/src/runtime/session_gateway.ts
- packages/server/src/session/SessionManager.ts
- packages/server/src/session/sessionConfigAssets.ts
- packages/server/src/session/sessionMetadataBuilder.ts
- packages/web/src/translation/context/\*_/_
- packages/web/src/components/player/resourceV2Snapshots.ts
- tests/\*_/_ (engine, server, integration, web)
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run check` _(fails: contents \\`developmentTarget\\` TypeError – pre-existing regression)_

## Follow-ups

- Monitor downstream consumers for any latent assumptions about optional ResourceV2 fields and clean up redundant fallback logic as teams confirm the new guarantees.
- Continue tracking the existing `developmentTarget` regression until resolved so full-suite checks remain stable for future tasks.
