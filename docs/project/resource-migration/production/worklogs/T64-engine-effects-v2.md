## Summary

- Introduced ResourceV2 testing helpers for amount, percent, and stat payloads so legacy suites can assert on familiar keys while exercising the new `{ resourceId, change }` structure.
- Migrated engine effect suites to consume the helpers, updated percent rounding expectations to rely on reconciled deltas, and removed obsolete metadata usage.
- Adjusted additive stat and passive coverage to align with the helper outputs and ensure nested effect definitions use ResourceV2 payloads.

## Touched Files

- packages/engine/tests/effects/add_building.test.ts
- packages/engine/tests/effects/add_development.test.ts
- packages/engine/tests/effects/add_stat.test.ts
- packages/engine/tests/effects/nonnegative.test.ts
- packages/engine/tests/effects/passive-add.test.ts
- packages/engine/tests/effects/resource-add.test.ts
- packages/engine/tests/effects/resource-remove.test.ts
- packages/engine/tests/effects/result-mod-evaluation.test.ts
- packages/engine/tests/effects/result-mod.evaluation.test.ts
- packages/engine/tests/helpers/resourceV2Params.ts
- docs/project/resource-migration/production/worklogs/T64-engine-effects-v2.md

## Tests

- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/effects packages/engine/tests/additive-stat-pct.test.ts packages/engine/tests/effects/nonnegative.test.ts` _(fails: @kingdom-builder/contents lacks RESOURCE_V2_REGISTRY in this environment)_

## Follow-ups

- Investigate how to supply `RESOURCE_V2_REGISTRY` (or stub the contents build) when running targeted Vitest suites so engine effect tests can execute successfully outside the full repository pipeline.
