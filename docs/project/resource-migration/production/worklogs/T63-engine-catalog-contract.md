# Resource Migration MVP - P2 - T63 - Engine runtime catalog contract

## Summary

- Required a RuntimeResourceCatalog when constructing `GameState` and `EngineContext`, ensuring catalog-dependent helpers can assume its presence.
- Removed optional access patterns from resource V2 effect handlers and population helpers, leaning on the guaranteed catalog to simplify logic.
- Updated engine setup, cloning, and unit tests to pass the runtime catalog at creation time and to assert catalog availability for the stricter contract.

## Touched Files

- docs/project/resource-migration/production/worklogs/T63-engine-catalog-contract.md
- packages/engine/src/actions/context_clone.ts
- packages/engine/src/ai/index.ts
- packages/engine/src/context.ts
- packages/engine/src/effects/population_resource.ts
- packages/engine/src/resource-v2/effects/addRemove.ts
- packages/engine/src/resource-v2/effects/transfer.ts
- packages/engine/src/setup/create_engine.ts
- packages/engine/src/state/index.ts
- packages/engine/tests/context/engine-context.test.ts
- packages/engine/tests/effects/population.test.ts
- packages/engine/tests/resource-v2/effects-handlers.test.ts
- packages/engine/tests/resource-v2/transfer-handlers.test.ts
- packages/engine/tests/state/state.test.ts

## Tests

- npm run format
- npm run lint
- npm run check _(fails: ResourceV2 registries undefined when loading @kingdom-builder/contents)_
- npx vitest run --config vitest.engine.config.ts packages/engine/tests/context packages/engine/tests/runtime/session.test.ts packages/engine/tests/resource-v2 _(fails: ResourceV2 registries undefined when loading @kingdom-builder/contents)_

## Follow-ups

- Investigate why Vitest and npm run check resolve `@kingdom-builder/contents` without initialising `RESOURCE_V2_REGISTRY`, preventing the engine suites from executing under the stricter catalog contract.
