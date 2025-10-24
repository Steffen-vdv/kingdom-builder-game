# T55 – Web Translation ResourceV2 Migration

## Summary

- Swapped legacy resource/stat diffing for ResourceV2-aware summaries, hover details, and passive attachments.
- Normalised action/phase logging to derive deltas from ResourceV2 snapshots and signed gain data.
- Added shared ResourceV2/legacy mapping helpers for UI + translation consumers.
- Extended compensation logging to backfill ResourceV2 values.

## Tests

- [x] `npm run format`
- [x] `npm run lint`
- [ ] `npm run check` (fails: `developmentTarget()` import resolves to non-function during `test:coverage:engine`)

## Follow-ups

- Verify downstream UI panels that still depend on legacy resource registries and migrate them to ResourceV2 metadata.
