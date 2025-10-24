# Resource Migration MVP - P2 - T33 - Build & Develop Actions ResourceV2 Migration

## Summary

- Annotated every build action with ResourceV2 construction and upkeep payloads derived from each building definition so downstream systems can reason about costs with the new change schema.
- Updated development actions to attach shared construction payloads and any development upkeep to the new ResourceV2 change metadata while keeping legacy cost handling intact.
- Audited chained build/develop passives to confirm existing ResourceV2-aware helpers cover tier and upkeep effects without additional migrations.

## Touched Files

- packages/contents/src/actions/buildActions.ts
- packages/contents/src/actions/developActions.ts
- docs/project/resource-migration/production/worklogs/T33-build-develop-actions.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(fails: repository typecheck expects prebuilt protocol/contents `dist` artifacts; see `tsc` errors for missing `/packages/**/dist/index.d.ts` outputs)_

## Follow-ups / Open Questions

- Once build/develop engine handlers consume ResourceV2 payloads directly, replace the duplicated common development cost list with runtime-derived construction metadata to avoid drift.
- Verify upcoming UI/analytics consumers read the new `construction`/`upkeep` payloads before deprecating the legacy cost collectors.
