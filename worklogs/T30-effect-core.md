# Resource Migration MVP - P2 - T30 - Effect Core Refactor

## Summary

- Added ResourceV2 effect method enumerations to the shared builder constants and introduced the `resource_v2` type for downstream effect authors.
- Tightened `EffectBuilder` guards, removed the legacy `allowShortfall()` helper, and reworked `statAddEffect` to pipe through ResourceV2 change builders.
- Updated happiness helper expectations, basic action definitions, and stat utilities to align with ResourceV2 change payloads.

## Downstream Migrations

- Replace remaining `Types.Stat`/`StatMethods` usages across content definitions with ResourceV2 change builders (e.g., `developments.ts`, `buildings.ts`, `phases.ts`).
- Audit content and tests that still rely on legacy resource params (`resourceParams`, `statParams`) and migrate them to ResourceV2 builders once corresponding engine handlers land.
- Coordinate engine/web updates to drop `allowShortfall` handling after all content no longer emits the flag.
