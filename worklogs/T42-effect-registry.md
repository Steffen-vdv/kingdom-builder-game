# Resource Migration MVP - P2 - T42 - Effect Registry ResourceV2 Swap

## Summary

- Retargeted core effect registrations so `resource:add`, `resource:remove`, `resource:transfer`, and the new `resource:upper-bound:increase` dispatch through the ResourceV2 handlers with runtime catalog enforcement.
- Replaced legacy exports with ResourceV2 counterparts and re-exported the additive/removal handlers through the ResourceV2 module surface for downstream consumers.
- Updated ResourceV2 handler tests to import from the consolidated module entry point.

## Touched Files

- packages/engine/src/effects/index.ts
- packages/engine/src/resource-v2/index.ts
- packages/engine/tests/resource-v2/effects-handlers.test.ts
- worklogs/T42-effect-registry.md

## Tests

- npm run format
- npm run lint
- npm run check _(fails: upstream `developmentTarget` helper missing from contents suite)_

## Follow-ups

- Backfill ResourceV2-aware fixtures for the remaining engine test suites so they can pass once the contents regression is resolved.
- Retire the unused legacy resource/stat handler modules once all remaining call sites migrate to ResourceV2 APIs.
