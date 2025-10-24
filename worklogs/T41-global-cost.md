# Resource Migration MVP - P2 - T41 - Global Action Cost Enforcement

## Summary

- Sourced the global action cost resource from the runtime ResourceV2 catalog, rejecting per-action overrides when a catalog-level cost is configured.
- Defaulted action cost calculations to the catalog's global amount and prevented stale legacy defaults, including updated tests covering the new enforcement.

## Touched Files

- packages/engine/src/actions/costs.ts
- packages/engine/src/setup/create_engine.ts
- packages/engine/src/setup/player_setup.ts
- packages/engine/tests/actions/costs.behavior.test.ts
- worklogs/T41-global-cost.md

## Tests

- npm run format
- npm run lint
- npm run check _(interrupted after ~36s during known long-running coverage suite; prior project tasks document the outstanding developmentTarget() failure in engine coverage)_

## Follow-ups

- Capture the `developmentTarget()` coverage failure output once the engine suite stabilises so future agents can link the precise stack trace to the living document.
- Propagate the catalog-driven global cost enforcement into downstream services (snapshots, AI heuristics) once ResourceV2 values fully replace legacy resource bags.
