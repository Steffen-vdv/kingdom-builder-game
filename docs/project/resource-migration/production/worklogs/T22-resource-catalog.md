# Resource Migration MVP - P2 - T22 - Resource Catalog Registries

## Summary

- Composed the core, happiness, stat, and population ResourceV2 definitions into a single ordered collection for registry assembly.
- Materialised reusable ResourceV2 and group registries plus a builder helper that recreates the catalog on demand.
- Exposed the new registries and builder through the package indexes while retaining all legacy exports intact.

## Touched Files

- docs/project/resource-migration/production/production-living-docs.md
- packages/contents/src/index.ts
- packages/contents/src/resourceV2/catalog.ts
- packages/contents/src/resourceV2/index.ts
- docs/project/resource-migration/production/worklogs/T22-resource-catalog.md

## Tests

- _Not run – catalog assembly only_

## Decisions

- **Ordering:** Established the catalog order as Core → Happiness → Stats → Population roles so consumers see economic tracks first, followed by morale, long-term stats, and finally group-scoped population resources. The population group retains its explicit order of 3 to leave room for future stat groupings ahead of it.
- **Registry reuse:** Pre-built static registries for default exports and kept `buildResourceCatalogV2()` available for consumers that need fresh instances, avoiding accidental mutation of the shared singletons.

## Follow-ups

- Thread the catalog into runtime/bootstrap code once the engine loader lands so the new registries surface beyond content.
- Revisit group ordering once additional ResourceGroups are introduced to ensure the catalog still mirrors the desired HUD layout.
