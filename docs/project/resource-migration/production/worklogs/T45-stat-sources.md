# Resource Migration MVP - P2 - T45 - Stat Sources ResourceV2 Mapping

## Summary

- Updated stat source resolution and recording to index contributions by ResourceV2 ids and propagate percent-stat dependencies using the unified identifiers.
- Synced PlayerState helpers with ResourceV2 touched flags so stat history now mirrors the new resource tracking infrastructure across clones and simulations.

## Touched Files

- packages/engine/src/stat_sources/meta.ts
- packages/engine/src/stat_sources/resolver.ts
- packages/engine/src/state/index.ts
- packages/engine/tests/actions/context-clone.test.ts
- packages/engine/tests/phases/simulate-upcoming-phases.test.ts
- packages/engine/tests/runtime/simulate-upcoming-phases.test.ts
- packages/engine/tests/stat-sources.longevity.test.ts
- packages/engine/tests/stat-sources.metadata.test.ts

## Tests

- `npm run lint` ✅
- `npx vitest run --config vitest.engine.config.ts packages/engine/tests/stat-sources` ❌ _(blocked by known `developmentTarget` TypeError from contents; suites aborted before execution)_
- `_Not run – awaiting fix for known repository-wide \`developmentTarget\` TypeError before executing full npm run check\_`

## Follow-ups

- Update remaining evaluator dependency collectors once ResourceV2 stat ids propagate through evaluator payloads so nested comparisons return canonical ids without requiring PlayerState lookups.
- Audit downstream consumers of `PlayerState.statSources` to confirm they expect ResourceV2 keys and backfill adapters where legacy keys are still assumed.
- Re-run full repository checks after the `developmentTarget` regression is resolved to validate the broader engine/test suites.
