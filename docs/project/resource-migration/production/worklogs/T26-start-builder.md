# Resource Migration MVP - P2 - T26 - Start Config Builder Extensions

## Summary

- Added `valuesV2()` and `resourceBoundsV2()` setters to the start-config player builder so contents can author ResourceV2 payloads alongside the legacy maps.
- Mirrored legacy `resources()` calls into `valuesV2` by default and seeded empty ResourceV2 bound maps so older configurations keep working while transports adopt the new fields.
- Backed the new surface area with validation tests covering automatic mirroring, explicit bound configuration, and duplicate guardrails.

## Touched Files

- packages/contents/src/config/builders/startConfig/index.ts
- packages/contents/src/config/builders/startConfig/playerStartBuilder.ts
- packages/contents/tests/start-config-builder-validations.test.ts
- docs/project/resource-migration/production/worklogs/T26-start-builder.md

## Tests

- _Not run – awaiting full contents suite once downstream consumers wire the new setters_

## Decisions

- Defaulted all ResourceV2 maps to empty objects when the builder is constructed, then gated mutation through the existing `set()` helper to preserve the one-shot semantics content authors expect.
- Reused the legacy resource record for mirroring rather than inventing a new projection to keep the migration path clear—explicit `valuesV2()` calls override the fallback when content starts diverging.

## Follow-ups

- Consider ergonomics helpers (e.g., `.resourceLowerBoundsV2()`/`.resourceUpperBoundsV2()` shorthands or catalog-driven presets) once real ResourceV2 bounds land so authors do not need to thread two maps manually.
- Audit downstream start-config consumers to confirm they gracefully handle the always-present (possibly empty) ResourceV2 maps before we tighten validation further.
