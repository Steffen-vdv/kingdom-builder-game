# Resource Migration MVP - P2 - T53 - Web translation context ResourceV2 integration

## Summary

- Extended the translation context to clone ResourceV2 catalogs, player value/bound maps, and expose metadata selectors alongside legacy registries.
- Added signed gain helpers layered on session snapshots so translation consumers can read positive/negative deltas without mutating underlying log arrays.
- Updated tests and stubs to cover ResourceV2 catalog metadata, fallback descriptors, and the new selector surfaces while preserving legacy expectations.

## Touched Files

- docs/project/resource-migration/production/worklogs/T53-web-context.md
- packages/web/src/translation/context/contextHelpers.ts
- packages/web/src/translation/context/createTranslationContext.ts
- packages/web/src/translation/context/index.ts
- packages/web/src/translation/context/resourceV2.ts
- packages/web/src/translation/context/types.ts
- packages/web/tests/getRequirementIcons.test.ts
- packages/web/tests/helpers/translationContextStub.ts
- packages/web/tests/translation/createTranslationContext.test.ts

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError in `packages/contents/src/happinessHelpers.ts` during repository check)_

## Follow-ups

- Wire the new signed gain helpers into downstream UI translators once transports provide live ResourceV2 deltas.
- Audit remaining translation utilities for direct legacy lookups and migrate them to the shared ResourceV2 context module.
- Capture documentation for the new `resourceV2` context helpers in the front-end translation guide after final validation.
