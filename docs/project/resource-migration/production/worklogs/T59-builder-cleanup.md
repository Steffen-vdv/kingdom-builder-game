# Resource Migration MVP - P2 - T59 - Builder cleanup

## Summary

- Retired the legacy `resourceParams`, `statParams`, and `transferParams` builders from the content config layer in favour of the ResourceV2 helpers.
- Added ResourceV2 transfer helpers and migrated basic and hire actions to the new change builders.
- Removed obsolete validation coverage and refreshed docs to describe the updated helper usage.

## Touched Files

- docs/project/resource-migration/production/worklogs/T59-builder-cleanup.md
- packages/contents/README.md
- packages/contents/src/actions/basicActions.ts
- packages/contents/src/actions/hireActions.ts
- packages/contents/src/config/builders.ts
- packages/contents/src/config/builders/advancedEffectParams.ts
- packages/contents/src/config/builders/effectParams.ts
- packages/contents/src/config/builders/effectParams/resourceParams.ts
- packages/contents/src/config/builders/effectParams/statParams.ts
- packages/contents/src/helpers/resourceV2Effects.ts
- packages/contents/tests/builder-validations.test.ts

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError in `packages/contents/src/happinessHelpers.ts` during repository check)_

## Notes

- Engine handlers still consume the legacy `key`/`amount` properties, so the new helpers continue to emit them alongside the ResourceV2 payload.
- Additional cleanup is required in engine tests once the `allowShortfall` flag is formally retired.

## Follow-ups

- Update the production living document to reference the new helper modules after downstream validation.
- Confirm downstream content packages no longer import the removed builders before deleting historical migration references.
