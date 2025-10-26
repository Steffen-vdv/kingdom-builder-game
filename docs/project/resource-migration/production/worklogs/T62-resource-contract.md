# Resource Migration MVP - P2 - T62 - ResourceV2 Payload Hardening

## Summary

- Promoted ResourceV2 registries, player value maps, and catalog payloads to
  required fields in the protocol contracts and snapshot typings so downstream
  consumers can rely on them without optional fallbacks.
- Updated engine snapshotting, session gateways, and server transport helpers to
  emit the required registries in every session response, including a dedicated
  ResourceV2 catalog cloner for session metadata.
- Refreshed web translation context, UI helpers, and test fixtures to assume
  ResourceV2 data is always present, introducing a shared clone helper and
  tightening fake API registries.

## Touched Files

- packages/protocol/src/config/session_contracts/shared.ts
- packages/protocol/src/session/contracts.ts
- packages/protocol/src/session/index.ts
- packages/engine/src/runtime/\*_/_
- packages/server/src/session/**/\*, packages/server/tests/**/\*
- packages/web/src/components/player/resourceV2Snapshots.ts
- packages/web/src/services/gameApi.fake.helpers.ts
- packages/web/src/state/\*_/_
- packages/web/src/translation/\*_/_
- packages/web/tests/\*_/_
- tests/integration/dev-mode-start-config.test.ts
- tests/integration/royal-decree-session.test.ts
- docs/project/resource-migration/production/worklogs/T62-resource-contract.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- npm run format
- npm run check _(fails: known `developmentTarget` TypeError in contents test
  harness; see chunk 42f100†L1-L120 for details)_

## Follow-ups

- Unblock the lingering `developmentTarget` helper regression so repository
  checks complete without the contents suite failure.
- Run HUD and translation smoke tests once transports surface signed ResourceV2
  deltas in dev-mode sessions.
