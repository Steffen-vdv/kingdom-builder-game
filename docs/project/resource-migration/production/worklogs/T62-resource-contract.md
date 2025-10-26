# Resource Migration MVP - P2 - T62 - ResourceV2 session contract hardening

## Summary

- Flipped `SessionRegistriesPayload.resourcesV2/resourceGroupsV2`, `SessionPlayerStateSnapshot.valuesV2/resourceBoundsV2`, and `SessionGameSnapshot.resourceCatalogV2` to required protocol fields and updated documentation accordingly.
- Ensured engine snapshots, session gateways, and player snapshot cloning always populate the new required payloads while propagating the runtime catalog across context clones.
- Updated web translation context, selectors, components, and fixtures/tests (plus integration/engine suites) to consume the guaranteed ResourceV2 payloads without optional fallbacks.
- Captured the work in project docs, closing out the "default ResourceV2 fields" TODO.

## Touched Files

- docs/project/resource-migration/production/worklogs/T62-resource-contract.md
- docs/project/resource-migration/production/production-living-docs.md
- packages/engine/src/actions/context_clone.ts
- packages/engine/src/runtime/engine_snapshot.ts
- packages/engine/src/runtime/player_snapshot.ts
- packages/engine/src/runtime/session_gateway.ts
- packages/engine/tests/runtime/session-gateway.test.ts
- packages/engine/tests/runtime/session.test.ts
- packages/protocol/src/session/contracts.ts
- packages/protocol/src/session/index.ts
- packages/web/src/components/player/resourceV2Snapshots.ts
- packages/web/src/translation/context/contextHelpers.ts
- packages/web/src/translation/context/createTranslationContext.ts
- packages/web/src/translation/context/resourceV2.ts
- packages/web/src/translation/context/types.ts
- packages/web/src/translation/log/diffSections.ts
- packages/web/src/translation/log/snapshots.ts
- packages/web/tests/getRequirementIcons.test.ts
- packages/web/tests/helpers/sessionFixtures.ts
- packages/web/tests/resource-bar.test.tsx
- packages/web/tests/translation/createTranslationContext.test.ts
- tests/integration/dev-mode-start-config.test.ts
- tests/integration/royal-decree-session.test.ts

## Tests

- npm run format
- npm run lint
- npm run check

## Follow-ups

- Monitor downstream consumers for any lingering assumptions about optional ResourceV2 data and remove obsolete compatibility layers as they surface.
