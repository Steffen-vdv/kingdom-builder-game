# Resource Migration MVP - P2 - T22 - Resource Catalog Assembly

## Summary

- Added a catalog module that stitches together core, happiness, stat, and population ResourceV2 definitions into frozen ordered collections.
- Generated reusable ResourceV2 and group registries from the catalog so callers can consume consistent lookups without rebuilding arrays.
- Re-exported the catalog builder and registries through the package entrypoints while keeping legacy resource exports intact.

## Decisions

- **Resource ordering:** Maintained the legacy presentation flow by listing core resources first, followed by Happiness, stats, and finally population roles so downstream UIs transition from economy → morale → strategic stats → staffing.
- **Group ordering:** Preserved the population group order established in T21 (order 3) and isolated it in the catalog to ease future insertion of economy or morale group shells without renumbering.

## Follow-ups

- Add future group definitions (e.g., for core economy or happiness tracks) as they materialize so the catalog reflects the full ResourceV2 taxonomy.
- Confirm whether consumer modules need helper selectors (beyond the registries) before retiring the legacy `RESOURCES` and `STATS` exports.
