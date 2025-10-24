# Resource Migration MVP - P2 - T37 - Content Aggregation

## Summary

- Consolidated the content-side ResourceV2 migration (T18–T36) to highlight remaining engine-facing gaps and ensure the living doc reflects completion of catalog, start payload, and content action rewrites.

## Touched Files

- docs/project/resource-migration/production/production-living-docs.md
- docs/project/resource-migration/production/worklogs/T37-content-aggregation.md

## Tests

- _Not run – documentation aggregation only_

## Unresolved Engineering Questions

1. **Resource bounds & debt handling (T18, T32):** Can the engine confirm whether gold—and other spendable tracks—must allow negative balances, or should the clamp-to-zero behaviour remain enforced when ResourceV2 payloads arrive?
2. **Legacy metadata parity (T23, T35):** Should capacity/formatting attributes that currently live in the legacy bridge move onto canonical ResourceV2 definitions before the engine swaps to the new payloads?
3. **Runtime catalog exposure (T24, T25, T27):** What is the plan for surfacing ResourceV2 catalog snapshots and start-value maps through engine bootstrap/session contracts so protocol and web clients can consume them without dual legacy mirrors?
4. **Percent-from-stat reconciliation (T30, T31):** How will the engine handle percent-based stat/resource deltas once ResourceV2 change payloads replace the legacy `allowShortfall`/`percentFromStat` metadata?
5. **Transfer validation defaults (T29, T31):** Will the engine enforce donor/recipient sign parity and default options when consuming ResourceV2 transfer payloads, or should the builders add additional guards before adoption?
6. **Build pipeline blockers (T33, T36):** Can the engine/testing owners provide guidance or automation to supply the required `dist` artefacts and reduce the long-running `npm run check` coverage step that currently needs manual cancellation?

## Linked Worklogs

- [`docs/project/resource-migration/production/worklogs/T18-core-resource-defs.md`](./T18-core-resource-defs.md)
- [`docs/project/resource-migration/production/worklogs/T19-happiness-tier.md`](./T19-happiness-tier.md)
- [`docs/project/resource-migration/production/worklogs/T20-stat-defs.md`](./T20-stat-defs.md) through [`docs/project/resource-migration/production/worklogs/T36-population-phase.md`](./T36-population-phase.md)
