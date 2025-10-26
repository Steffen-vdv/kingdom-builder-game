## Summary

- Added resource/stat parameter helpers for tests so effect suites can build ResourceV2 payloads while keeping legacy assertions stable.
- Updated effect-focused engine tests to consume the helpers, migrate percent rounding to `change.roundingMode`, and drop legacy shortfall metadata.

## Touched Files

- packages/engine/tests/helpers/resourceV2Params.ts
- packages/engine/tests/effects/add_stat.test.ts
- packages/engine/tests/effects/passive-add.test.ts
- packages/engine/tests/effects/resource-add.test.ts
- packages/engine/tests/effects/resource-remove.test.ts
- packages/engine/tests/effects/nonnegative.test.ts
- packages/engine/tests/effects/add_building.test.ts
- packages/engine/tests/effects/result-mod-evaluation.test.ts
- packages/engine/tests/effects/result-mod.evaluation.test.ts
- packages/engine/tests/effects/add_development.test.ts

## Tests

- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/effects packages/engine/tests/additive-stat-pct.test.ts packages/engine/tests/effects/nonnegative.test.ts` _(fails: RESOURCE_V2_REGISTRY missing from @kingdom-builder/contents)_

## Follow-ups

- Ensure the Vitest environment preloads `RESOURCE_V2_REGISTRY` so effect suites depending on ResourceV2 data can execute.
