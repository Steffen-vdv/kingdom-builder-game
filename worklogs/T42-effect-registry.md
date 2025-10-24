# Resource Migration MVP - P2 - T42 - Effect Registry ResourceV2 Swap

## Summary

- Retargeted the core effect registry so `resource:add`, `resource:remove`, `resource:transfer`, and `resource:upper-bound:increase` dispatch to the ResourceV2 handlers.
- Removed the legacy resource handler imports from the registry barrel and exported the ResourceV2 implementations for downstream use.
- Updated the resource transfer regression test to consume evaluation constants from `@kingdom-builder/protocol`, keeping it aligned with the ResourceV2 module locations.

## Touched Files

- packages/engine/src/effects/index.ts
- packages/engine/tests/effects/resource-transfer-percent-bounds.test.ts
- worklogs/T42-effect-registry.md

## Tests

- _not run (registry refactor only)_
