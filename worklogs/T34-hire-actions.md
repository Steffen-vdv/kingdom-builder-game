# Resource Migration MVP - P2 - T34 - Hire Actions ResourceV2 Metadata

## Summary

- Annotated each hire action with ResourceV2 change payload metadata covering the happiness reward and role passives so downstream consumers can track every immediate adjustment when hiring population roles.
- Centralised the happiness reward change and helper wiring so both metadata and legacy resource effects share the same ResourceV2 configuration while leaving evaluator wiring untouched.
- Confirmed the population capacity requirement continues to rely on the role-targeted evaluator after the parameter refactor.

## Touched Files

- packages/contents/src/actions/hireActions.ts
- worklogs/T34-hire-actions.md
- docs/project/resource-migration/production/production-living-docs.md

## Tests

- `npm run format`
- `npm run lint`
- `npm run check` _(aborted after the engine coverage suite passed initial cases; the repository still expects precompiled `dist` artifacts before typecheck/test can finish cleanly)_

## Follow-ups / Open Questions

- Coordinate with engine consumers to ingest the new hire action `resourceChanges` metadata once ResourceV2 effect handlers begin reading change payloads directly.
- Audit UI logging once ResourceV2 session payloads land to ensure hire summaries surface both happiness gains and passive stat boosts without duplicate bookkeeping.
