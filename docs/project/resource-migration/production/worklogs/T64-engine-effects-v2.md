## Summary

- Added `resourceV2Params` helpers so engine effect tests can build `{ resourceId, change }` payloads while keeping legacy assertion fields.
- Migrated resource and stat-focused effect suites to consume the helpers and updated rounding expectations to match reconciled percent deltas.

## Touched Files

- packages/engine/tests/helpers/resourceV2Params.ts
- packages/engine/tests/effects/add_building.test.ts
- packages/engine/tests/effects/add_development.test.ts
- packages/engine/tests/effects/add_stat.test.ts
- packages/engine/tests/effects/nonnegative.test.ts
- packages/engine/tests/effects/passive-add.test.ts
- packages/engine/tests/effects/resource-add.test.ts
- packages/engine/tests/effects/resource-remove.test.ts
- packages/engine/tests/effects/result-mod-evaluation.test.ts
- packages/engine/tests/effects/result-mod.evaluation.test.ts

## Tests

- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/effects packages/engine/tests/additive-stat-pct.test.ts packages/engine/tests/effects/nonnegative.test.ts` _(fails: RESOURCE_V2_REGISTRY missing from @kingdom-builder/contents)_

## Follow-ups

- Ensure the Vitest engine suites receive populated ResourceV2 registries so the contents package exposes `RESOURCE_V2_REGISTRY` during isolated test runs.
