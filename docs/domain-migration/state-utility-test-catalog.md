# Domain Migration - T11-2-2-12-7 - State, Utility, and Translation Test Catalog

This catalog tracks the web-layer test suites that exercise selector-driven session
metadata. The suites listed below previously imported registries directly from
`@kingdom-builder/contents`; they now build their fixtures through the
`createSessionRegistries` helpers and translation context factories so that domain
migration refactors can swap providers without rewriting the tests.

- `packages/web/tests/state/formatPhaseResolution.integration.test.ts`
- `packages/web/tests/state/formatPhaseResolution.test.ts`
- `packages/web/tests/state/sessionSelectors.test.ts`
- `packages/web/tests/state/useCompensationLogger.test.tsx`
- `packages/web/tests/translation/createTranslationContext.test.ts`
- `packages/web/tests/utils/sessionStateHelpers.ts`

Each suite references the selector contracts outlined in
`docs/domain-migration/registry-consumers.md` to validate fallback behaviour,
memoization guards, and DTO shape expectations.

## Verification Commands

- `npx vitest run packages/web/tests/state/formatPhaseResolution.test.ts \
    packages/web/tests/state/formatPhaseResolution.integration.test.ts \
    packages/web/tests/state/sessionSelectors.test.ts \
    packages/web/tests/state/useCompensationLogger.test.tsx \
    packages/web/tests/translation/createTranslationContext.test.ts \
    packages/web/tests/utils/sessionStateHelpers.ts`

  Ensures the selector-driven session registries and translation context
  factories still exercise memoization behaviour and fallback handling without
  relying on `@kingdom-builder/contents` imports.
