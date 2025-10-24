# Resource Migration MVP - P2 - T52 - Integration Test ResourceV2 Migration

## Summary

- Updated integration and regression fixtures to hydrate engines with the ResourceV2 runtime catalog and compute expectations from `valuesV2` deltas rather than legacy resource/stat maps.
- Refreshed integration flows (building placement, happiness tiers, action effect groups, synthetic runs, dev-mode snapshot) to assert ResourceV2 payloads, plus created synthetic ResourceV2 registries where required.

## Touched Files

- tests/integration/action-effect-groups.test.ts
- tests/integration/building-placement.test.ts
- tests/integration/building-stat-bonus.test.ts
- tests/integration/dev-mode-start-config.test.ts
- tests/integration/edge-cases.test.ts
- tests/integration/fixtures.ts
- tests/integration/happiness-tier-content.test.ts
- tests/integration/random-game-flow.test.ts
- tests/integration/synthetic.ts
- tests/integration/turn-cycle.test.ts
- packages/engine/tests/helpers.ts

## Tests

- `npm run format` (pass) – ensured Prettier check succeeds after fixture and doc edits.【2b34bd†L1-L6】
- `npm run lint` (pass) – dependency cruiser and ESLint clean.【a37bbb†L1-L9】
- `npm run check` (fails) – known `developmentTarget` regression still aborts engine coverage.【f90799†L89-L129】

## Follow-ups

- Verify `npm run check` once the known `developmentTarget` regression is cleared to ensure the migrated tests execute under the full repository suite.
- Propagate ResourceV2 assertions into remaining protocol/web regression harnesses once transports expose the new payloads.
