# Resource Migration MVP - P2 - T25 - Protocol Start Schema

## Summary

- Extended the protocol start configuration schema to carry optional ResourceV2 player values, bound overrides, and runtime catalog snapshots without breaking the legacy resource/stat/population maps.
- Updated engine and server start-config helpers to preserve and apply the new ResourceV2 records so downstream merging, compensation, and registry derivation stay consistent during the migration.
- Captured temporary expectations for the placeholder catalog schema and documented follow-up wiring required to surface real ResourceV2 data.

## Touched Files

- `packages/protocol/src/config/schema.ts`
- `packages/engine/src/setup/player_setup.ts`
- `packages/engine/src/setup/start_config_resolver.ts`
- `packages/server/src/session/sessionConfigAssets.ts`
- `docs/project/resource-migration/production/production-living-docs.md`

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(partially completed; terminated during the long-running web suite due to environment limits)_

## Follow-ups

- Replace the loose `resourceCatalogV2` schema with a typed snapshot once the runtime catalog wiring lands in the protocol layer.
- Extend session payload builders to emit the new ResourceV2 start fields so the web client can begin reading them alongside the legacy data.
- Revisit compensation diffing when ResourceV2 transfers go live to ensure V2 values and bounds reconcile correctly during multi-phase overrides.
