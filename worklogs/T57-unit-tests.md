# Resource Migration MVP - P2 - T57 - Unit Test Adjustments

## Test Runs

- `npx vitest run --config vitest.config.ts packages/contents/tests/resourceV2/resourceV2TransferBoundBuilders.test.ts`
  - ✅ Passed after updating transfer builder expectations.
- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/resource-v2/state.test.ts packages/engine/tests/resource-v2/effects-handlers.test.ts`
  - ✅ Passed after shimming @kingdom-builder/contents dependencies with local vi.mocks and updating the shared ResourceV2 test factory to avoid eager content bootstrapping.

## Notes

- Refactored engine tests to consume the ResourceV2 testing factories directly, reducing bespoke fixture code.
- Added mocks for happiness helper and legacy resource/stat lookups so the new factories can execute without the full content bootstrap pipeline.
- Patched the shared ResourceV2 testing factory to depend on module-local builders instead of the heavy contents index, avoiding repeated bootstrap work in engine suites.
