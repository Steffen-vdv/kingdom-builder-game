## Summary

- Made EngineContext and GameState require a runtime resource catalog during construction and updated setup helpers accordingly.
- Refreshed engine unit tests to align with the strict catalog requirement.

## Touched Files

- packages/engine/src/actions/context_clone.ts
- packages/engine/src/ai/index.ts
- packages/engine/src/context.ts
- packages/engine/src/effects/population_resource.ts
- packages/engine/src/resource-v2/effects/addRemove.ts
- packages/engine/src/resource-v2/effects/transfer.ts
- packages/engine/src/setup/create_engine.ts
- packages/engine/src/state/index.ts
- packages/engine/tests/context/effect-logs.test.ts
- packages/engine/tests/context/engine-context.test.ts
- packages/engine/tests/context/queue.test.ts
- packages/engine/tests/effects/population.test.ts
- packages/engine/tests/resource-v2/effects-handlers.test.ts
- packages/engine/tests/resource-v2/transfer-handlers.test.ts
- packages/engine/tests/state/state.test.ts

## Tests

- `npm run lint`
- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/context packages/engine/tests/runtime/session.test.ts packages/engine/tests/resource-v2` _(fails: RESOURCE_V2_REGISTRY missing from @kingdom-builder/contents)_

## Follow-ups

- Resolve the missing `RESOURCE_V2_REGISTRY` export when running targeted engine vitest suites so the catalog-backed tests complete successfully.
