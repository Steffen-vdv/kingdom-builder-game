# Resource Migration MVP - P2 - T30 - Effect Builder Core Alignment

## Summary

- Removed the legacy `allowShortfall()` helper from the effect builder and updated resource effects to set the flag explicitly when older content still requires it.
- Added ResourceV2 bound enumerations to `builderShared.ts` and hardened the `effect()` convenience wrapper to reject method-only usage so new parameter builders remain type-safe.
- Migrated `statAddEffect()` to build ResourceV2 change payloads keyed by the stat’s unified identifier, paving the way for downstream stat migrations.

## Validation Gaps

- Content modules still rely on legacy `statParams()`/`Types.Stat` entries; follow-up tasks should migrate those builders to the ResourceV2 change helpers introduced here.
- Engine handlers continue to honour the `allowShortfall` meta flag; removing the behavioural dependency requires the tier-based shortfall replacement tracked in the project backlog.
- Resource bound method enumerations currently expose only the increase flow; add decrease variants once engine/runtime support lands per the design document.

## Downstream Migrations

- Audit `packages/contents/src/developments.ts`, `packages/contents/src/populations.ts`, and `packages/contents/src/phases.ts` to replace `statParams()` with ResourceV2 change builders.
- Update engine effect registration to dispatch `resource:add`/`resource:remove` onto the ResourceV2 handlers before migrating additional helpers.
- Wire the new bound method constants into upcoming content once upper-bound adjustments leave the prototype phase.
