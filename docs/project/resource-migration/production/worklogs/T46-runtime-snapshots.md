# Resource Migration MVP - P2 - T46 - Runtime Snapshots

## Summary

- Extended runtime player/session snapshots to emit ResourceV2 values, bound maps, and metadata while deriving the legacy `resources` and `stats` maps from the new data for backwards compatibility.
- Mirrored the new ResourceV2 payloads through action traces/log snapshots and recent resource gain logging so downstream consumers observe signed deltas keyed by canonical ResourceV2 ids.
- Captured helper utilities to translate runtime ResourceV2 catalog metadata into SessionSnapshot metadata and documented the rollout expectations for downstream clients.

## Touched Files

- packages/engine/src/context.ts
- packages/engine/src/effects/resource_add.ts
- packages/engine/src/log.ts
- packages/engine/src/runtime/engine_snapshot.ts
- packages/engine/src/runtime/player_snapshot.ts
- packages/protocol/src/session/index.ts
- docs/project/resource-migration/production/worklogs/T46-runtime-snapshots.md _(this file)_

## Tests

- `npm run format` _(pending)_
- `npm run lint` _(pending – blocked by known `developmentTarget` TypeError in contents suite)_
- `npm run check` _(pending – blocked by known `developmentTarget` TypeError in contents suite)_

## Follow-ups

- Update server/web session transport layers to consume the new `valuesV2`, `resourceBoundsV2`, and metadata payloads once the transports stop mirroring legacy registries only.
- Backfill engine/web tests verifying Option A signed logging with ResourceV2 ids once the failing repository check is unblocked.
- Confirm downstream translators render group parents using `resourceGroupMetadataV2` after wiring in the new metadata fields.
