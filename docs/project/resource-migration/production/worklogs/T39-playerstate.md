# Resource Migration MVP - P2 - T39 - Player State Resource Proxy

## Summary

- Proxied legacy `resources`, `stats`, and `population` accessors to ResourceV2 state so all canonical values and bounds flow through the unified maps.
- Synced legacy key mappings with the runtime ResourceV2 catalog (including clone propagation and migration of existing values) to keep dynamic accessors aligned with catalog entries.

## Touched Files

- packages/engine/src/actions/context_clone.ts
- packages/engine/src/state/index.ts
- docs/project/resource-migration/production/worklogs/T39-playerstate.md

## Tests

- npm run format
- npm run lint
- npm run check _(fails: `TypeError: (0 , developmentTarget) is not a function` from `packages/contents/src/happinessHelpers.ts` during engine coverage)_

## Follow-ups

- Verify upcoming tasks update `applyPlayerStartConfiguration` to seed ResourceV2 value/bound overrides via the new mappings once catalog-driven start payloads land.
- Audit other legacy bridges (e.g., snapshots, requirement evaluators) to ensure they leverage the proxy mappings before removing legacy bags.
- Resolve the `developmentTarget()` TypeError blocking `npm run check` so the coverage stage can complete.
