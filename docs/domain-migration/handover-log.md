# Domain Migration Handover Log

## Domain Migration - P3 - T9 - Remote Session Mirror Removal

- Removed the legacy engine mirror and developer-mode bootstrap so session lifecycle now flows entirely through the remote adapter backed by the session state store.【F:packages/web/src/state/sessionSdk.ts†L1-L340】【F:packages/web/src/state/remoteSessionAdapter.ts†L1-L220】
- Simplified runtime configuration by dropping developer preset plumbing after the mirror removal, keeping only the favicon bootstrap metadata.【F:packages/web/src/startup/runtimeConfig.ts†L1-L140】【F:packages/web/src/startup/runtimeConfigFallback.json†L1048-L1054】

## Domain Migration - P3 - T10 - Session Queue Store Integration

- Refactored `packages/web/src/state/useSessionQueue.ts` to route UI tasks
  through the session state store's promise queue and to source cached
  snapshots from the authoritative record instead of the legacy engine mirror.
- Updated `GameProviderInner` and queue helper wiring so the unified session
  adapter is retrieved via `getCurrentSession`, and expanded the session SDK
  tests to seed the store during mocked workflows.
- Added `packages/web/tests/state/useSessionQueue.test.ts` to verify the hook
  defers to the store-backed queue seed and reads fallback snapshots from the
  store cache, preventing regressions while the legacy engine mirror is
  retired.

## Domain Migration - P3 - T6 - Session State Store Bootstrap

- Added `packages/web/src/state/sessionStateStore.ts` to cache authoritative
  session snapshots, rule snapshots, registries, resource keys, and metadata
  emitted by the protocol service. The store clones incoming payloads to guard
  against accidental mutation and seeds a per-session promise queue used by the
  web client to coordinate serialized lifecycle tasks.
- `sessionSdk` now initializes and mutates the store whenever snapshots refresh,
  ensuring effect logs and passive metadata remain accessible to translation
  contexts even when the Engine mirror is not queried. The SDK also clears the
  store on release.
- `GameContext` consumes the cached queue seed so the UI promise chain resets
  safely on session hand-off, and new tests under
  `packages/web/tests/state/sessionStateStore.test.ts` confirm registry merge
  semantics and cloning behaviour.

## Domain Migration - P1 - T17 - Stat Summary Metadata Decoupling

- Reworked `packages/web/src/utils/stats.ts` and supporting descriptors to read
  stat labels, icons, and percent-display metadata from translation context
  assets built from registry metadata, removing the dependency on
  `@kingdom-builder/contents` stat constants and Engine snapshot types.
- Verified stat detail builders operate solely on protocol stat contribution
  payloads and translation context assets so summary rendering stays aligned
  with registry metadata.
- Extended translation asset builders to surface `displayAsPercent` flags so
  UI formatters no longer need the contents package to render percentage-based
  stats.

## Domain Migration - P1 - T16 - Passive Stat Metadata Decoupling

- Updated `packages/web/src/utils/stats/historyEntries.ts` and
  `packages/web/src/utils/stats/passiveFormatting.ts` to consume stat source
  metadata from the protocol contracts and to format trigger/passive labels via
  translation context assets instead of Engine or content constants.
- Adjusted `packages/web/src/utils/stats/summary.ts` and
  `packages/web/tests/stat-breakdown.test.ts` to forward the protocol metadata
  and trigger assets required by the revised helpers.

## Domain Migration - P1 - T15 - Stat Source Protocol Alignment

- `dependencyFormatters` and stat descriptor helpers now import
  `SessionStatSourceLink`/`SessionStatSourceMeta` from the protocol instead of
  the engine snapshots. Helper signatures preserve their existing names via
  type aliases so downstream consumers continue to compile without updates.

## Domain Migration - P1 - T6 - Phase Progress Protocol Alignment

- `usePhaseProgress.helpers` now reads phase advance payloads via
  `SessionAdvanceResult`/`SessionAdvanceSkipSnapshot` from the protocol,
  removing the direct `LegacySession` type import. The helper still depends on
  a snapshot-capable session handle; TODO: replace the structural session
  dependency with a protocol service once the remote lifecycle API is ready.

## Domain Migration - P1 - T2 - Current Couplings Review

### Remaining files to decouple

- Player interface surfaces continue to rely on engine snapshots for rendering
  (`packages/web/src/components/player/*.tsx`,
  `packages/web/src/state/useNextTurnForecast.ts`, `packages/web/src/utils/stats.ts`).
  `packages/web/src/state/useActionResolution.ts` now consumes
  `SessionPlayerStateSnapshot` from the protocol, confirming the migration path for
  resolution logging. Coordinated refactors should provide domain DTOs to replace
  direct `PlayerStateSnapshot` and `EngineAdvanceResult` dependencies once protocol
  selectors are available.
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

## Domain Migration - P1 - T9 - AI Parameter Payloads

- `useAiRunner` now consumes `ActionParametersPayload` from the protocol
  contracts so AI-triggered actions share the same parameter envelope as the
  rest of the client. `sessionSdk` mirrors remote executions with the same
  payload to keep local engine state in sync, and the associated tests were
  updated to accept the protocol payload shape.
- Future work: the AI bridge still overrides the engine's `performAction`
  dependency directly. We will need a protocol-level hook (or server-side AI
  orchestration endpoint) that surfaces the same parameter payload contract so
  the web client can stop injecting overrides into `runAiTurn`.

## Domain Migration - P3 - T3 - Session metadata transport endpoints

- Registered session transport endpoints for action metadata, AI turns, and
  phase simulations so the domain handover includes HTTP access to the new
  protocol routes.

## Domain Migration - P3 - T7 - Web legacy session interface audit

- Documented the explicit `LegacySession` interface exposed to the web layer,
  reflecting the methods consumed during migration (costs, requirements,
  options, AI helpers, simulation, etc.) and the queue helpers seeded from the
  remote session store.

## Domain Migration - P3 - T8 - Remote Session SDK Adapter

- Replaced the engine-backed mirror in `packages/web/src/state/sessionSdk.ts`
  with a protocol-driven adapter that shares the session queue store, forwards
  lifecycle calls to `GameApi`, and caches registries, snapshots, metadata, and
  advance results directly in the session state store.
- Added queue helpers to the session state store to serialize remote mutations
  and expose snapshot-only updates for action responses, ensuring the adapter
  can refresh local caches without the engine.
- Updated `GameProviderInner` to call the remote `updatePlayerName` utility and
  rewrote the session SDK test suite to exercise remote behaviour using the
  revised `GameApiFake`, removing the final engine dependencies from the web
  session bootstrap path.

## Domain Migration - P3 - T14 - Phase progress snapshot mirroring

- Rewired `usePhaseProgress` and its helper to source all snapshots from the
  remote session state store and drive phase advancement exclusively through the
  `advanceSessionPhase` API, so queued snapshots fuel diff formatting without
  invoking legacy engine methods. Tests now seed the session state store instead
  of engine mocks to cover the remote workflow.
