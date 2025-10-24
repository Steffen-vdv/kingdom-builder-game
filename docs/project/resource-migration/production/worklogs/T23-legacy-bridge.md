# Resource Migration MVP - P2 - T23 - Legacy Builder Bridge

## Summary

- Replaced the legacy builder pipelines in `resources.ts`, `stats.ts`, and `populationRoles.ts` with adapters that read from the `RESOURCE_V2_REGISTRY`, ensuring the exported records stay keyed by the original identifiers while mirroring ResourceV2 ordering.
- Preserved legacy-only metadata by layering targeted overrides (e.g., stat capacity and display formats) on top of the ResourceV2 definitions so downstream consumers remain unaffected.
- Added a dedicated map between legacy keys and ResourceV2 identifiers to keep the bridge explicit and easy to retire once consumers adopt the new schema end to end.

## Touched Files

- docs/project/resource-migration/production/production-living-docs.md
- packages/contents/src/populationRoles.ts
- packages/contents/src/resourceV2/definitions/population.ts
- packages/contents/src/resources.ts
- packages/contents/src/stats.ts
- docs/project/resource-migration/production/worklogs/T23-legacy-bridge.md

## Tests

- _Not run – legacy bridge refactor pending engine adoption_

## Decisions

- Iterate the ordered ResourceV2 registry to guarantee the legacy records always follow the canonical catalog ordering rather than maintaining bespoke arrays that could drift.
- Keep the overrides for stat formatting inside the bridge for now instead of extending ResourceV2 metadata until stakeholders confirm those attributes belong in the new schema.

## Follow-ups

- Migrate remaining content modules that still materialise `ResourceInfo`/`StatInfo` structures (e.g., the builder helpers under `packages/contents/src/config/builders/`) onto ResourceV2-aware helpers so the bridge can eventually disappear.
- Evaluate whether capacity/format metadata should live on ResourceV2 definitions to eliminate the ad-hoc overrides once more use cases surface.
- Audit engine/web consumers for direct `Resource`/`Stat` key usage to plan phased adoption of ResourceV2 identifiers.
