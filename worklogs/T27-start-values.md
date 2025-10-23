# Resource Migration MVP - P2 - T27 - Start Values Seeding

## Summary

- Populated the start configuration `valuesV2` and bound maps directly from the ResourceV2 catalog while keeping the legacy resource/stat/population maps unchanged for compatibility.
- Added reusable helpers that translate legacy start values into ResourceV2 identifiers, capture catalog-derived bounds, and fail fast when mismatches surface.
- Updated dev-mode presets and the last-player compensation override to seed ResourceV2 payloads alongside the existing legacy fields.

## Decisions

- Stored the legacy start payloads as named constants in `game.ts` so both the legacy and V2 projections share a single source of truth during the migration window.
- Surfaced catalog bounds automatically for every mapped ResourceV2 entry instead of duplicating clamp values in content, ensuring catalog updates propagate without manual edits.
- Raised build-time errors when the helper encounters mismatched legacy/V2 projections to detect drift immediately rather than silently emitting partial payloads.

## Follow-ups

- Replace the temporary legacy-to-ResourceV2 mapping tables once downstream systems consume ResourceV2 identifiers end to end so start configs no longer maintain dual maps.
- Extend start-mode fixtures (e.g., scenario presets) to opt into the helper once their migrations land to keep all start payloads aligned.

## Legacy vs. ResourceV2 Audit

- Base player start: ✅ legacy and V2 maps match.
- Dev-mode player preset: ✅ legacy and V2 maps match.
- Dev-mode player override "B": ✅ legacy and V2 maps match.
- Last-player compensation: ✅ legacy and V2 maps match.
