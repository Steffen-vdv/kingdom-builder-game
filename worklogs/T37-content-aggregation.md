# Resource Migration MVP - P2 - T37 - Content Aggregation & Handover

## Summary

- Reviewed worklogs T18–T36 and rolled their outcomes into the production living doc status snapshot and latest handover.
- Confirmed that all content definitions, catalogs, builders, start payloads, and migrated actions/passives now emit ResourceV2 metadata alongside legacy fields.
- Captured outstanding engineering questions that must be resolved before retiring the legacy resource/stat surfaces.

## Scope & Inputs

- docs/project/resource-migration/production/worklogs/T18-core-resource-defs.md
- docs/project/resource-migration/production/worklogs/T19-happiness-tier.md
- worklogs/T20-stat-defs.md
- worklogs/T21-population-resources.md
- worklogs/T22-resource-catalog.md
- worklogs/T23-legacy-bridge.md
- worklogs/T24-rules-alignment.md
- worklogs/T25-protocol-start-schema.md
- worklogs/T26-start-builder.md
- worklogs/T27-start-values.md
- worklogs/T28-effect-builder.md
- worklogs/T29-transfer-bound-builders.md
- worklogs/T30-effect-core.md
- worklogs/T31-param-migration.md
- worklogs/T32-basic-actions.md
- worklogs/T33-build-develop-actions.md
- worklogs/T34-hire-actions.md
- worklogs/T35-passive-content.md
- worklogs/T36-population-phase.md

## Progress Highlights

- **Resource definitions & catalog:** Core, stat, happiness, and population tracks now share consistent identifiers, ordering, bounds, and registry accessors (T18–T23).
- **Start pipeline:** Protocol schemas, builders, and seeding helpers expose ResourceV2 `values`, `lowerBounds`, and `upperBounds` maps derived from the catalog (T25–T27).
- **Effect authoring:** ResourceV2 change/transfer builders, legacy param adapters, and shared helpers cover add/remove, transfer, and bound increases (T28–T31).
- **Content migrations:** Basic/build/develop/hire actions, passive bonuses, population definitions, and phase effects consume the new builders and emit ResourceV2 payloads (T32–T36).

## Outstanding Engineering Questions

1. **Negative balance policy & reconciliation defaults:** Does gold (or any other core resource) need to support debt/negative balances in ResourceV2, or should engine reconciliation keep clamping at zero? (T18 follow-up.)
2. **Canonical identifier + ordering guarantees:** Can engine/runtime owners confirm the `resource:core|population:role:<slug>` id scheme and current catalog ordering should be treated as stable contracts for downstream clients? (T18/T21 follow-up.)
3. **Runtime exposure of ResourceV2 data:** When will engine bootstrap/session payloads surface ResourceV2 registries and player `valuesV2`/bounds so the web translators can consume them without legacy mirrors? (T22/T24/T25/T27 follow-ups.)
4. **Percent-from-stat handling:** What is the engine plan for ResourceV2 percent deltas sourced from stats so the content helpers can drop legacy-specific branches? (T31 follow-up.)
5. **Transfer validation semantics:** Should the ResourceV2 transfer builder enforce donor/recipient sign symmetry and richer option payloads in content, or will the engine own these invariants? (T29/T31 follow-ups.)
6. **`npm run check` coverage runtime:** Can engineering provide guidance or tooling changes to keep the engine coverage suite from stalling `npm run check`, or should content authors continue aborting the command mid-run? (T32/T35/T36 follow-ups.)

## Next Steps

- Monitor responses to the questions above and update the living doc status table once engine/runtime owners commit to timelines.
- Continue logging future content migrations in dedicated worklogs and funnel cross-cutting decisions back through this aggregation thread.
