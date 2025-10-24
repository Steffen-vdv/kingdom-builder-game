# Resource Migration MVP - P2 - T41 - Global Action Cost Enforcement

## Summary

- Sourced the common action-cost resource from the ResourceV2 runtime catalog, mapping flagged definitions back to legacy keys and surfacing the configured amount for the engine context.
- Enforced the catalog-defined global cost by blocking per-action overrides, rejecting collector contributions, and defaulting costs during resolution while preserving legacy fallbacks when no global flag exists.
- Updated engine tests to align with catalog-driven action costs and documented the new enforcement contract.

## Touched Files

- packages/engine/src/actions/context_clone.ts
- packages/engine/src/actions/costs.ts
- packages/engine/src/context.ts
- packages/engine/src/effects/building_add.ts
- packages/engine/src/setup/create_engine.ts
- packages/engine/src/setup/player_setup.ts
- packages/engine/tests/actions/synthetic.test.ts
- packages/engine/tests/ai/tax-collector.test.ts
- packages/engine/tests/effects/add_development.test.ts
- packages/engine/tests/effects/add_stat.test.ts
- packages/engine/tests/effects/nonnegative.test.ts
- packages/engine/tests/effects/resource-add.test.ts
- packages/engine/tests/effects/resource-remove.test.ts
- packages/engine/tests/plunder-zero-gold.test.ts
- packages/engine/tests/runtime/session.test.ts
- docs/project/resource-migration/production/worklogs/T41-global-cost.md

## Tests

- npm run format
- npm run lint
- npm run check _(fails: see known `developmentTarget` TypeError in contents coverage)_

## Follow-ups

- Update content builders and downstream consumers to omit legacy action point costs now that the global catalog flag enforces them automatically.
- Thread the resolved global cost amount through session snapshots and client state if downstream consumers require explicit disclosure beyond the resource metadata.
