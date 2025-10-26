## Summary

- Updated engine action, runtime, phase, AI, and service suites to construct ResourceV2 payloads via shared helpers, ensuring tests target `{ resourceId, change }` structures instead of legacy `{ key, amount }` literals.
- Adjusted assertions that previously inspected legacy resource rounding or shortfall metadata to validate ResourceV2 reconciliation outputs through player `resourceValues` lookups, covering tax penalties, result modifiers, and cloning scenarios.
- Refreshed shared fixtures (phase test environment and result modifier stacks) to emit synthetic effects with ResourceV2 helpers and documented the migration worklog entry for traceability.

## Touched Files

- packages/engine/tests/actions/army-attack-happiness.test.ts
- packages/engine/tests/actions/context-clone.test.ts
- packages/engine/tests/actions/royal-decree-effect-group.test.ts
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
- `npm run lint`

## Follow-ups

- Investigate provisioning the compiled `@kingdom-builder/contents` registry bundle (or a stub) inside the Vitest environment so ResourceV2 suites can execute locally without manual content builds.
