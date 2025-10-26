## Summary

- Added ResourceV2-aware test helpers to provide new `{ resourceId, change }` payloads while preserving legacy assertions.
- Updated engine effect suites to consume the helpers and aligned expectations with reconciled change metadata.

## Touched Files

- packages/engine/tests/additive-stat-pct.test.ts
- packages/engine/tests/effects/add_building.test.ts
- packages/engine/tests/effects/add_development.test.ts
- packages/engine/tests/effects/add_stat.test.ts
- packages/engine/tests/effects/nonnegative.test.ts
- packages/engine/tests/effects/passive-add.test.ts
- packages/engine/tests/effects/resource-add.test.ts
- packages/engine/tests/effects/resource-remove.test.ts
- packages/engine/tests/effects/result-mod-evaluation.test.ts
- packages/engine/tests/effects/result-mod.evaluation.test.ts
- packages/engine/tests/effects/stat-add-pct-step-reset.test.ts
- packages/engine/tests/helpers/resourceV2Params.ts
- docs/project/resource-migration/production/worklogs/T64-engine-effects-v2.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(interrupted after starting coverage suite; will require a re-run)_
- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/effects packages/engine/tests/additive-stat-pct.test.ts packages/engine/tests/effects/nonnegative.test.ts` _(fails: ResourceV2 registry resolution error)_

## Follow-ups

- Investigate Vitest engine configuration or module aliasing so the ResourceV2 registries are available during isolated suite runs.
- Re-run `npm run check` once the Vitest failure is resolved to ensure full repository validation.
