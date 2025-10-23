# Resource Migration MVP - P2 - T28 - ResourceV2 Effect Builder

## Summary

- Introduced `resourceChange(resourceId)` helper in `packages/contents/src/resourceV2/effects/changeBuilder.ts` for authoring `resource:add`/`resource:remove` params.
- Builder exposes `amount()`, `percent()`, `roundingMode()`, `reconciliation()`, `suppressHooks()`, and `build()` chainable calls.
- Reconciliation defaults to `clamp` and rejects unsupported modes until future phases unlock additional strategies.
- Percent changes accept one or more modifiers; rounding is optional and enforced to follow a prior `percent()` call.

## Validation Gaps

- The builder only checks that numeric inputs are finite; it does **not** currently enforce integer values or non-negative magnitudes for additive changes.
- Hook suppression remains a blind pass-through flag. There is no guard that the caller documents the recursion risk noted in the design doc.
- Future reconciliation modes (`pass`, `reject`) deliberately throw today; the code will need updating once the engine adds support.
