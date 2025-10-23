# Resource Migration MVP - P2 - T28 - Effect Change Builder

## Summary

- Added a chainable `resourceChange()` helper that produces ResourceV2 effect params for amount and percent adjustments with rounding, reconciliation, and hook suppression toggles.
- Exported the builder through the ResourceV2 barrel so action/building definitions can author V2 effect payloads without duplicating param shapes.
- Documented known validation gaps: the builder still accepts unsupported reconciliation modes (`pass`, `reject`) and does not enforce integer rounding compatibility with legacy percent semantics.

## Touched Files

- `packages/contents/src/resourceV2/effects/changeBuilder.ts`
- `packages/contents/src/resourceV2/effects/index.ts`
- `packages/contents/src/resourceV2/index.ts`
- `worklogs/T28-effect-builder.md`

## Tests

- _Not run – content builder additions only_

## Follow-ups

- Disallow unsupported reconciliation modes once the engine implements `pass`/`reject` strategies or confirm they should be filtered at authoring time.
- Consider auto-normalising percent modifiers (e.g., merging duplicate calls, validating arrays) if playtesting reveals frequent mistakes.
- Revisit rounding validation after percent evaluators migrate to ResourceV2 to ensure content authors receive early feedback for mismatched strategies.
