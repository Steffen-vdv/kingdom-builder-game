# Resource Migration MVP - P2 - T35 - Passive Content ResourceV2 Migration

## Summary

- Replaced legacy `resourceParams`/`statParams` usage in building passives with ResourceV2 change payloads, bridging resource keys to their canonical ids while retaining legacy fields for downstream consumers.
- Updated development bonuses to share the same ResourceV2 change helpers so gold income and stat boosts now emit unified `resourceId` metadata alongside the existing amount properties.
- Added lightweight helper utilities in the affected content modules to standardise ResourceV2 amount payload construction during the transition period.

## Touched Files

- packages/contents/src/buildings.ts
- packages/contents/src/developments.ts
- worklogs/T35-passive-content.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(aborted during engine vitest coverage run to avoid the multi-suite runtime; format/lint/typecheck stages completed beforehand)_

## Follow-ups / Open Questions

- Extend the new helpers (or replace them with shared utilities) once other content modules migrate off the legacy param builders to avoid duplication.
- Revisit percent-based stat/resource modifiers after confirming their dedicated ResourceV2 payload shapes so growth/war-weariness adjustments can be ported cleanly.
