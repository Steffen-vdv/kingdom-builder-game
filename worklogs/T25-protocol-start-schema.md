# Resource Migration MVP - P2 - T25 - Protocol Start Schema Updates

## Summary

- Added optional ResourceV2 start-value, lower-bound, and upper-bound maps to the start configuration schema while keeping legacy resource/stat/population maps intact.
- Extended the game configuration schema to ingest precomputed ResourceV2 catalog snapshots, allowing transports to seed upgraded clients without breaking older loaders.
- Exported the catalog snapshot type so downstream packages can share a single contract when wiring migration-aware bootstrapping flows.

## Decisions

- Chose structured Zod schemas for ResourceV2 catalog snapshots (registry ordering plus metadata) to mirror the content builder output and keep runtime validation strict during the migration window.
- Reused a shared numeric record schema for all start-value maps to ensure legacy and v2 payloads stay consistent and simplify future validation tweaks.

## Follow-ups

- Thread the ResourceV2 catalog snapshot through session/runtime responses once the engine exposes the new bootstrap surfaces.
- Populate the new start-value maps from real ResourceV2 state when the migration pipeline begins emitting them, and drop any temporary shims that mirror legacy values.
