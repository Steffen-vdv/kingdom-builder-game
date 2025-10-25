# Resource Migration MVP - P2 - T36 - Population & Phase ResourceV2 Migration

## Summary

- Introduced `helpers/resourceV2Effects.ts` to centralise ResourceV2 change payload builders for flat and percent-based stat/resource adjustments while preserving legacy fields during the transition.
- Refactored population definitions to reuse the new helpers for council AP gains and role assignment bonuses, emitting `resourceId` metadata instead of relying on legacy param builders.
- Updated phase step effects (growth strength scaling and war recovery) to consume the shared helpers so phase-driven stat deltas now surface ResourceV2 change payloads.

## Touched Files

- packages/contents/src/helpers/resourceV2Effects.ts
- packages/contents/src/populations.ts
- packages/contents/src/phases.ts
- docs/project/resource-migration/production/worklogs/T36-population-phase.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(aborted during `test:coverage:engine`; format/typecheck/lint stages completed beforehand)_

## Follow-ups / Open Questions

- Full engine coverage runs remain prohibitively long; continue documenting partial `npm run check` executions until the suite can be parallelised or trimmed.
- Evaluate whether additional content modules can reuse the new helper to eliminate remaining `resourceParams`/`statParams` usage.
