# Resource Migration MVP - P2 - T62 - ResourceV2 Session Contract Hardening

## Summary

- Promoted ResourceV2 registries, player value maps, and catalog mirrors to required fields in the protocol session contracts and validation schemas.
- Updated engine snapshot/clone helpers and transports to always emit ResourceV2 catalogs, values, and bounds while tightening runtime guards.
- Adjusted web translation context, selectors, and fixtures/tests to rely on the always-present ResourceV2 data instead of optional fallbacks.
- Synced server metadata builders and gateway tests with the mandatory ResourceV2 registries.
- Captured the rollout in the production living documentation and new worklog entry.

## Touched Files

- packages/protocol/src/session/contracts.ts
- packages/protocol/src/session/index.ts
- packages/protocol/src/config/action_contracts.ts
- packages/protocol/src/config/session_contracts/shared.ts
- packages/engine/src/runtime/engine_snapshot.ts, packages/engine/src/runtime/player_snapshot.ts, packages/engine/src/actions/context_clone.ts
- packages/server/src/session/SessionManager.ts, sessionMetadataBuilder.ts, sessionConfigAssets.ts, mergeSessionMetadata.ts, registryUtils.ts
- packages/web/src/components/player/resourceV2Snapshots.ts, state/sessionRegistries.ts, state/useAiRunner.ts, translation/context/**/\*, translation/log/**/\*
- packages/web/tests/\*\* (fixtures, translation, resource bar, integration harness updates)
- packages/engine/tests/runtime/session-gateway.test.ts, packages/engine/tests/runtime/session.test.ts, packages/server/tests/HttpSessionGateway.test.ts
- packages/web/src/services/gameApi.fake.ts, packages/web/src/services/gameApi.fake.helpers.ts
- docs/project/resource-migration/production/worklogs/T62-resource-contract.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- npm run format
- npm run check _(fails: known `packages/contents/src/happinessHelpers.ts` `developmentTarget` TypeError during engine coverage)_

## Follow-ups

- Resolve the longstanding `developmentTarget` coverage regression so full `npm run check` passes.
- Run HUD and translation smoke tests once transports emitting the hardened ResourceV2 payloads are deployed in dev mode.
