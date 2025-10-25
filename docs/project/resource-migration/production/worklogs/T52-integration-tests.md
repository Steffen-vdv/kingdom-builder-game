# Resource Migration MVP - P2 - T52 - Integration test ResourceV2 alignment

## Summary

- Updated integration fixtures to bootstrap the runtime ResourceV2 catalog and expose delta maps for `valuesV2`, keeping helper utilities aligned with engine bootstrap requirements.
- Refreshed action/building flow tests to assert both the legacy mirrors and ResourceV2 value maps so regressions are caught while fallbacks coexist.
- Ensured session-based tests (dev mode presets, royal decree, translation harnesses) validate catalog metadata, player value maps, and mirrored descriptors for downstream UI coverage.
- Documented ResourceV2 metadata propagation for translation providers so synthetic registry contexts populate `resourcesV2` alongside legacy descriptors during log rendering.

## Touched Files

- docs/project/resource-migration/production/production-living-docs.md
- docs/project/resource-migration/production/worklogs/T52-integration-tests.md
- packages/engine/tests/helpers.ts
- tests/integration/action-effect-groups.test.ts
- tests/integration/action-log-hooks.test.ts
- tests/integration/building-placement.test.ts
- tests/integration/building-stat-bonus.test.ts
- tests/integration/dev-mode-start-config.test.ts
- tests/integration/edge-cases.test.ts
- tests/integration/fixtures.ts
- tests/integration/happiness-tier-content.test.ts
- tests/integration/market-translation.test.tsx
- tests/integration/random-game-flow.test.ts
- tests/integration/royal-decree-session.test.ts
- tests/integration/synthetic.ts
- tests/integration/tax-translation.test.tsx
- tests/integration/turn-cycle.test.ts

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError in `packages/contents/src/happinessHelpers.ts` during repository check)_

## Follow-ups

- Re-run the integration suite once the `developmentTarget` helper is restored to verify the ResourceV2 fixtures under full CI.
- Thread ResourceV2 snapshot assertions into any remaining translation or HUD flows that still rely on legacy fixture helpers.
- Coordinate with protocol/web owners to retire legacy delta mirrors after transports default to ResourceV2 payloads.
