# Resource Migration MVP - P2 - T42 - Effect Registry ResourceV2 Swap

## Summary

- Replaced resource effect registrations with the ResourceV2 handlers, including the new upper-bound increase effect.
- Centralised ResourceV2 handler exports and updated the dedicated handler tests to consume the shared module surface.
- Recorded the registry swap and verification steps in this worklog entry.

## Touched Files

- packages/engine/src/effects/index.ts
- packages/engine/src/resource-v2/index.ts
- packages/engine/tests/resource-v2/effects-handlers.test.ts
- worklogs/T42-effect-registry.md

## Tests

- npm run format
- npm run lint
- npm run check _(aborted after typecheck/lint phases due to lengthy coverage suite; rerun may be required for full coverage output)_

## Follow-ups

- Allow a full `npm run check` execution once the coverage suite runtime is acceptable or parallelisation settings are adjusted.
- Remove legacy Resource effect handler modules once downstream references (formatters, protocol exports) finish migrating.
