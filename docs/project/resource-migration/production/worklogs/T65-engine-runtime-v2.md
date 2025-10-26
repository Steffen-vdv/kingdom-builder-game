## Summary

- Updated engine action, phase, runtime, AI, and service tests to consume ResourceV2 helper payloads instead of legacy `{ key, amount/percent }` shapes, ensuring cloned fixtures stay in sync with reconciled values.
- Adjusted assertions that previously checked legacy resource deltas to also verify `resourceValues` via `getResourceV2Id`, covering shortfall, rounding, and passive stacking scenarios.
- Refreshed shared phase fixtures and result modifier stacks to emit helper-generated synthetic effects, keeping downstream evaluator coverage aligned with ResourceV2 IDs.

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

- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/actions packages/engine/tests/phases packages/engine/tests/runtime packages/engine/tests/ai packages/engine/tests/services` _(fails: @kingdom-builder/contents lacks RESOURCE_V2_REGISTRY in this environment)_

## Follow-ups

- Coordinate with contents packaging to expose `RESOURCE_V2_REGISTRY` during isolated Vitest runs so the targeted engine suites can execute without depending on the full monorepo bootstrap.
