# Domain Migration Handover Log

## Domain Migration - P1 - T6 - Phase Progress Protocol Alignment

- `usePhaseProgress.helpers` now reads phase advance payloads via
  `SessionAdvanceResult`/`SessionAdvanceSkipSnapshot` from the protocol,
  removing the direct `LegacySession` type import. The helper still depends on
  a snapshot-capable session handle; TODO: replace the structural session
  dependency with a protocol service once the remote lifecycle API is ready.

## Domain Migration - P1 - T2 - Current Couplings Review

### Remaining files to decouple

- Player interface surfaces continue to rely on engine snapshots for rendering (`packages/web/src/components/player/*.tsx`, `packages/web/src/state/useActionResolution.ts`, `packages/web/src/state/useNextTurnForecast.ts`, `packages/web/src/utils/stats.ts`). Coordinated refactors should provide domain DTOs to replace direct `PlayerStateSnapshot` and `EngineAdvanceResult` dependencies once protocol selectors are available.
- Session lifecycle utilities (`packages/web/src/state/sessionSdk.ts`, `packages/web/src/state/usePhaseProgress.helpers.ts`, `packages/web/src/state/formatPhaseResolution.ts`) still orchestrate engine sessions directly. A protocol-level session service is needed so the web client no longer calls `createEngineSession` or inspects `EngineAdvanceResult` payloads.
- Registry-driven translators (`packages/web/src/translation/effects/**`, `packages/web/src/translation/context/*.ts`) import content registries for icons and labels. These should migrate to selector outputs emitted by the contents service to avoid touching raw registries in React code.
- Passive metadata formatters (`packages/web/src/utils/stats/passiveFormatting.ts`, `packages/web/src/passives/visibility.ts`) and requirement helpers (`packages/web/src/utils/getRequirementIcons.ts`) still read registries and engine stat sources directly. Consolidate them behind migration-ready presenter utilities.

### Suspected API gaps

- No protocol equivalents exist for `ActionEffectGroup`/`ActionEffectGroupOption` typing, leaving action card components bound to engine definitions. The forthcoming protocol needs DTOs for selectable effect groups.
- Session bootstrap requires bundled content metadata (resources, populations, triggers). Provide a protocol endpoint that delivers the normalized metadata currently assembled via `defaultRegistryMetadata` and `RegistryMetadataContext`.
- Runtime configuration fallback (`packages/web/src/startup/runtimeConfig.ts`) still dynamically imports `@kingdom-builder/contents` to construct presets. Migration will need a protocol entry point that returns pre-normalized content snapshots so the web layer can drop the dynamic import and registry iteration.

## Domain Migration - P1 - T8 - Forecast Protocol Alignment

- Updated `useNextTurnForecast` and supporting tests to source
  `PlayerSnapshotDeltaBucket` and session snapshot typings from
  `@kingdom-builder/protocol`. Forecasting still depends on the engine's
  `session.simulateUpcomingPhases` implementation exposed through
  `useGameEngine()`; we will need protocol-facing simulation hooks before that
  dependency can be removed.
- Skip event formatting now consumes `SessionAdvanceSkipSnapshot` from `@kingdom-builder/protocol/session`, removing the dependency on engine skip exports for log/history rendering in `packages/web/src/utils/describeSkipEvent.ts` and its tests. Future skip handling tasks can safely evolve without touching engine internals.
