## Summary

- Migrated action, phase, runtime, AI, and service test suites to build ResourceV2 payloads through the shared helper utilities so they exercise `resourceId` and `change` metadata instead of legacy `{ key, amount }` literals.
- Updated downstream assertions to validate ResourceV2 reconciliation (e.g., resolving player resource ids and inspecting `resourceValues`) and refreshed fixtures such as phase scaffolds and result mod stacks to emit helper-generated payloads.
- Documented the partial test run and helper adoption for Runtime V2 coverage.

## Touched Files

- packages/engine/tests/actions/army-attack-happiness.test.ts
- packages/engine/tests/actions/context-clone.test.ts
- packages/engine/tests/actions/synthetic.test.ts
- packages/engine/tests/actions/tax-happiness.test.ts
- packages/engine/tests/ai/ai-system.integration.test.ts
- packages/engine/tests/ai/tax-collector.test.ts
- packages/engine/tests/phases/fixtures.ts
- packages/engine/tests/phases/simulate-upcoming-phases.test.ts
- packages/engine/tests/result-mod-stack.test.ts
- packages/engine/tests/runtime/session-gateway.test.ts
- packages/engine/tests/runtime/session.test.ts
- packages/engine/tests/runtime/simulate-upcoming-phases.test.ts
- packages/engine/tests/runtime/snapshot-advance.test.ts
- packages/engine/tests/services/passive-helpers.test.ts
- packages/engine/tests/services/passive-service.test.ts
- docs/project/resource-migration/production/worklogs/T65-engine-runtime-v2.md

## Tests

- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/actions packages/engine/tests/phases packages/engine/tests/runtime packages/engine/tests/ai packages/engine/tests/services` _(fails: RESOURCE_V2_REGISTRY is unavailable in this execution environment)_

## Follow-ups

- Provide a lightweight contents build (or registry stub) for targeted engine Vitest runs so ResourceV2 helpers can execute during CI/local checks without depending on the full contents packaging step.
