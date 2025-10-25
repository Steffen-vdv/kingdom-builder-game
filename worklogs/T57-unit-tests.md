# Task T57 – Unit Test Updates

## Summary

- Updated engine and content unit tests to exercise ResourceV2 builders, state helpers, and transfer handlers.
- Added coverage for the ResourceV2 change builder and adjusted legacy expectations to the new `resourceId`/`change` schema.

## Testing

- `npm run test --workspace @kingdom-builder/contents -- resourceV2/resourceV2ChangeBuilder.test.ts` ✅
- `npm run test --workspace @kingdom-builder/engine -- utils/applyParamsToEffects.test.ts` ✅
- `npm run test --workspace @kingdom-builder/engine -- effects/resource-add.test.ts effects/resource-remove.test.ts effects/resource-transfer-percent-bounds.test.ts actions/royal-decree-effect-group.test.ts` ⚠️ _(fails because Vitest loads `@kingdom-builder/contents` helpers before their evaluator factories are initialised; the runtime reports `developmentTarget` as undefined even after building the contents workspace.)_
