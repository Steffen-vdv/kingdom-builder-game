# Resource Migration MVP - P2 - T47 - AI Evaluators ResourceV2 alignment

## Summary

- Updated AI action loops and stat evaluators to read/write ResourceV2 values directly, preserving legality checks when action points drain.
- Ensured evaluator-driven requirements resolve stat values via ResourceV2 ids so automated comparisons stay in sync with the unified resource map.

## Touched Files

- packages/engine/src/ai/index.ts
- packages/engine/src/evaluators/stat.ts
- docs/project/resource-migration/production/worklogs/T47-ai-evaluators.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(fails: known `developmentTarget` TypeError in contents suite)_

## Follow-ups

- Monitor remaining engine modules (cost deduction, passive modifiers) for lingering direct `resources`/`stats` access and migrate them as subsequent tasks cover those surfaces.
- Coordinate with web session consumers once ResourceV2 values surface for AI-driven turn summaries to confirm no regressions in AP tracking.
