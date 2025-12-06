# Resource Migration MVP - P2 - T56 - Web tests ResourceV2 alignment

## Summary

- Re-seeded translation context coverage with ResourceV2 catalog and group snapshots from the shared factories, exercising metadata selectors, recent gain helpers, and catalog ordering through the new schema.
- Updated `ResourceBar` component tests to construct ResourceV2 value/bound snapshots, asserting hovercard titles, tier summaries, and button labels with catalog-driven formatting instead of legacy descriptors.
- Refreshed web log and resolution suites to expect icon-prefixed ResourceV2 summaries and stat labels, removing assertions tied to legacy-only formatting.

## Touched Files

- docs/project/resource-migration/production/production-living-docs.md
- docs/project/resource-migration/production/worklogs/T56-web-tests.md
- packages/web/tests/LogPanel.test.tsx
- packages/web/tests/ResolutionCard.test.tsx
- packages/web/tests/action-log-lines.test.ts
- packages/web/tests/helpers/sessionCloneHelpers.ts
- packages/web/tests/helpers/sessionFixtures.ts
- packages/web/tests/resource-bar.test.tsx
- packages/web/tests/state/formatPhaseResolution.test.ts
- packages/web/tests/state/useGameLog.test.ts
- packages/web/tests/translation/createTranslationContext.test.ts

## Tests

- npm run format
- npm run lint
- npm run check _(fails: known `developmentTarget` TypeError in `packages/contents/src/happinessHelpers.ts` during repository check)_

## Follow-ups

- Re-run the updated suites once transports emit ResourceV2 deltas to validate hovercard and log snapshots against live data.
- Remove temporary legacy formatting assertions after downstream components finish migrating to the new helpers.
- Share the new `sessionCloneHelpers` utilities with other front-end tests to standardise ResourceV2 fixture creation.
