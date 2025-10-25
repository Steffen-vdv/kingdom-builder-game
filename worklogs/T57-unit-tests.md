# Resource Migration MVP - P2 - T57

## Summary

- Updated content builder validation tests to assert the new ResourceV2 transfer payloads, including donor/recipient cloning and percent variants.
- Refactored engine ResourceV2 state tests to construct registries via the shared testing factories, ensuring tier tracking and parent aggregation logic are covered with runtime catalog materialisation.

## Testing

- `npx vitest run packages/contents/tests/builder-validations.test.ts` _(fails: `developmentTarget` helper is not initialised when `@kingdom-builder/contents` is imported directly in isolation)_
- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/resource-v2/state.test.ts` _(fails for the same reason as above during shared content initialisation)_

> Follow-up: the failure stems from the shared `developmentTarget()` helper resolving as `undefined` when Vitest loads `packages/contents/src/happinessHelpers.ts` outside the full suite. We should stub that helper (or expose the builders through a leaner entry point) so that isolated unit runs succeed.
