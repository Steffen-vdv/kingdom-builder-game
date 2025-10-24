# Resource Migration MVP - P2 - T47 - AI evaluators

## Summary

- Redirected AI action point tracking and stat evaluators to use ResourceV2 runtime values, eliminating legacy stat map assumptions.
- Updated AI tests to seed and verify action points via ResourceV2 helpers to ensure automated flows respect the new state pipeline.

## Touched Files

- packages/engine/src/ai/index.ts
- packages/engine/src/evaluators/stat.ts
- packages/engine/tests/ai/ai-system.integration.test.ts
- packages/engine/tests/ai/tax-collector.test.ts

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(fails: known `developmentTarget` TypeError while running engine coverage suites)_

## Follow-ups

- Investigate and resolve the `developmentTarget` TypeError surfaced by `npm run check` once the underlying contents utilities are updated.
