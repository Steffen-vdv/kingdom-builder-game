# Resource Migration MVP - P2 - T40 - Player Setup Resource Initialisation

## Summary

- Seeded player ResourceV2 state via `initialisePlayerResourceState` and prioritised `valuesV2`/bound overrides before legacy bags during start configuration.
- Applied ResourceV2-aware start compensation diffs so override payloads include values and bounds alongside legacy mirrors.
- Documented the migration touchpoints for player setup to keep the Resource Migration production log aligned.

## Touched Files

- packages/engine/src/setup/create_engine.ts
- packages/engine/src/setup/player_setup.ts
- worklogs/T40-player-setup.md

## Tests

- npm run format
- npm run lint
- npm run check

## Follow-ups

- Audit downstream systems (snapshots, compensation replay, session serialisation) to ensure they consume the ResourceV2 start payloads without relying on legacy mirrors.
- Backfill automated coverage for start configuration layering now that ResourceV2 state drives the baseline.
