## Summary

- Migrated AI turn handling and evaluator lookups to pull resource and stat totals directly from ResourceV2 state, removing legacy stat/resource map assumptions.
- Updated action cost verification to operate on ResourceV2 ids, refreshed affected tests, and documented ongoing `developmentTarget` failure blocking `npm run check`.

## Touched Files

- packages/engine/src/ai/index.ts
- packages/engine/src/actions/costs.ts
- packages/engine/src/evaluators/population.ts
- packages/engine/src/evaluators/stat.ts
- packages/engine/tests/actions/costs.behavior.test.ts
- packages/engine/tests/ai/ai-system.integration.test.ts
- packages/engine/tests/ai/tax-collector.test.ts

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(fails: known `developmentTarget` TypeError in contents suite)_

## Follow-ups

- Coordinate with contents owners to resolve the `developmentTarget` TypeError so full `npm run check` can complete.
- Audit remaining effect handlers and services that still emit legacy resource keys when interacting with ResourceV2 state.
