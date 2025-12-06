# T67 – Evaluator ResourceV2 Parameter Migration

## Summary

- Registered `resourceEvaluator` in the `EVALUATORS` registry.
- Updated all evaluators (stat, population, resource) to accept `resourceId` as
  the V2 parameter name with legacy parameters (`key`, `role`) as fallbacks.
- Added JSDoc deprecation notices for legacy parameters.
- Maintains backward compatibility with existing test and content usage.

## Touched Files

- `packages/engine/src/evaluators/index.ts` – imported and registered
  `resourceEvaluator`, exported it
- `packages/engine/src/evaluators/resource.ts` – added `resourceId` param with
  `key` as deprecated fallback
- `packages/engine/src/evaluators/stat.ts` – added `resourceId` param with `key`
  as deprecated fallback
- `packages/engine/src/evaluators/population.ts` – added `resourceId` param with
  `role` as deprecated fallback

## Tests

- `npm run test:quick` – pass (web: 370 passed, 3 skipped; server: 150 passed)
- `npm run test --workspace @kingdom-builder/engine -- --run requirement_builder
  evaluator_compare` – pass (2 tests)

Existing tests continue to work with legacy parameter names (`key`, `role`)
while new code can use the V2 `resourceId` parameter.

## Follow-ups

- Update content definitions and tests to use `resourceId` instead of `key`/`role`
  when creating new evaluator usages.
- Consider consolidating stat/population/resource evaluators into a single
  `resource` evaluator since they now all delegate to `getResourceValue()` with
  ResourceV2 IDs.
