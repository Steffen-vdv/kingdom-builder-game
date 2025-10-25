# Resource Migration MVP - P2 - T57 - Unit tests ResourceV2 alignment

- Updated contents ResourceV2 builder tests to exercise the new `bounds()` helper, ensure duplicate setters throw, and rely on the published `@kingdom-builder/contents` exports.
- Expanded transfer builder coverage to validate percent change normalisation, guard against `suppressHooks()` in donors/recipients, and keep fixtures concise through the shared factories.
- Rebuilt engine ResourceV2 state tests with testing catalog factories, adding suppression/tier assertions that mirror the runtime helpers and effect handlers now in play.
- Verified targeted engine coverage with `npx vitest run --config vitest.engine.config.ts tests/runtime/session-gateway.test.ts` (fails: known `developmentTarget` regression) to document the repository-wide blocker.
