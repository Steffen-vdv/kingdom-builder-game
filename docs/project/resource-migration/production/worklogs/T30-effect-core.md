# Resource Migration MVP - P2 - T30 - Effect Core Migration Hooks

## Summary

- Removed the legacy `allowShortfall()` shortcut from the evaluator effect builder and enforced paired `type()`/`method()` guards so partially configured effects fail fast.
- Added ResourceV2 bound method enumerations alongside the existing builder constants to unblock new upper/lower bound content.
- Reworked `statAddEffect` (and dependent helpers) to build `resource:add` payloads through the ResourceV2 change builder, wiring stat keys through the new `getStatResourceV2Id()` bridge.
- Updated happiness helper tests and example content to consume the ResourceV2 builders while preserving existing happiness shortfall metadata manually.

## Touched Files

- packages/contents/src/actions/basicActions.ts
- packages/contents/src/config/builderShared.ts
- packages/contents/src/config/builders/evaluators/effectBuilder.ts
- packages/contents/src/stats.ts
- packages/contents/tests/happinessHelpers.test.ts
- docs/project/resource-migration/production/worklogs/T30-effect-core.md

## Tests

- _Not run – builder refactor pending engine switch to ResourceV2 payloads_

## Downstream Migrations

- Replace remaining `effect(Types.Stat, ...)` calls in content modules (`packages/contents/src/developments.ts`, `packages/contents/src/buildings.ts`, `packages/contents/src/populations.ts`, `packages/contents/src/phases.ts`) with ResourceV2 change helpers once translation/test coverage is ready.
- Audit other builder utilities that still emit legacy `resourceParams`/`statParams` payloads (e.g., `packages/contents/src/config/builders/effectParams`) for similar ResourceV2 upgrades.
- Align engine handlers and tests with the new ResourceV2 payloads so we can retire the temporary `allowShortfall` metadata and legacy resource/stat effect registration.
