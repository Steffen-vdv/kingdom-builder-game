# Domain Migration - P2 - T1 - Protocol handoff blueprint

## Current cross-domain imports

### Components (UI, contexts, and helpers)

`rg --no-heading --line-number "@kingdom-builder/(engine|contents)" \
  packages/web/src/Overview.tsx \
  packages/web/src/components \
  packages/web/src/contexts \
  packages/web/src/passives \
  packages/web/src/utils \
  packages/web/src/startup`

```
packages/web/src/Overview.tsx:33:
  } from '@kingdom-builder/contents';
packages/web/src/components/actions/GenericActionCard.tsx:5:
  } from '@kingdom-builder/engine';
packages/web/src/components/actions/populationHelpers.ts:1:
  import type { PopulationRoleId } from '@kingdom-builder/contents';
packages/web/src/components/actions/RaisePopOptions.tsx:2:
  import { type PopulationRoleId } from '@kingdom-builder/contents';
packages/web/src/components/actions/useEffectGroupOptions.ts:5:
  } from '@kingdom-builder/engine';
packages/web/src/components/overview/overviewTokenUtils.ts:11:
  import type { OverviewTokenCategoryName } from '@kingdom-builder/contents';
packages/web/src/components/overview/sectionsData.ts:6:
  } from '@kingdom-builder/contents';
packages/web/src/components/player/BuildingDisplay.tsx:2:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/components/player/LandDisplay.tsx:2:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/components/player/PassiveDisplay.tsx:3:
  import { PhaseId } from '@kingdom-builder/contents';
packages/web/src/components/player/PassiveDisplay.tsx:9:
  } from '@kingdom-builder/engine';
packages/web/src/components/player/PlayerPanel.tsx:2:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/components/player/PopulationInfo.tsx:2:
  import { Stat } from '@kingdom-builder/contents';
packages/web/src/components/player/PopulationInfo.tsx:3:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/components/player/ResourceBar.tsx:2:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/components/player/buildTierEntries.ts:1:
  import type { RuleSnapshot } from '@kingdom-builder/engine';
packages/web/src/contexts/RegistryMetadataContext.tsx:15:
  } from '@kingdom-builder/contents';
packages/web/src/contexts/defaultRegistryMetadata.ts:13:
  } from '@kingdom-builder/contents';
packages/web/src/passives/visibility.ts:1:
  import { POPULATIONS } from '@kingdom-builder/contents';
packages/web/src/passives/visibility.ts:2:
  import type { PassiveSummary } from '@kingdom-builder/engine';
packages/web/src/startup/runtimeConfig.ts:128:
  const contents = await import('@kingdom-builder/contents');
packages/web/src/utils/describeSkipEvent.ts:1:
  import type { AdvanceSkip } from '@kingdom-builder/engine';
packages/web/src/utils/getRequirementIcons.ts:6:
  } from '@kingdom-builder/contents';
packages/web/src/utils/stats.ts:1:
  import { STATS } from '@kingdom-builder/contents';
packages/web/src/utils/stats.ts:6:
  } from '@kingdom-builder/engine';
packages/web/src/utils/stats/dependencyFormatters.ts:5:
  } from '@kingdom-builder/engine';
packages/web/src/utils/stats/descriptorRegistry.ts:6:
  } from '@kingdom-builder/contents';
packages/web/src/utils/stats/format.ts:1:
  import { STATS } from '@kingdom-builder/contents';
packages/web/src/utils/stats/historyEntries.ts:1:
  import type { StatSourceMeta } from '@kingdom-builder/engine';
packages/web/src/utils/stats/passiveFormatting.ts:5:
  } from '@kingdom-builder/contents';
packages/web/src/utils/stats/passiveFormatting.ts:6:
  import type { StatSourceLink } from '@kingdom-builder/engine';
packages/web/src/utils/stats/passiveFormatting.ts:7:
  import type { StatSourceMeta } from '@kingdom-builder/engine';
packages/web/src/utils/stats/summary.ts:4:
  } from '@kingdom-builder/engine';
packages/web/src/utils/stats/triggerLabels.ts:1:
  import { TRIGGER_INFO } from '@kingdom-builder/contents';
```

### State (session and forecasting hooks)

`rg --no-heading --line-number "@kingdom-builder/(engine|contents)" \
  packages/web/src/state`

```
packages/web/src/state/developerModeSetup.ts:1:
  import type { EngineSession } from '@kingdom-builder/engine';
packages/web/src/state/developerModeSetup.ts:1:
  import type { PlayerId } from '@kingdom-builder/engine';
packages/web/src/state/formatPhaseResolution.ts:1:
  import type { EngineAdvanceResult } from '@kingdom-builder/engine';
packages/web/src/state/sessionSdk.ts:6:
  } from '@kingdom-builder/engine';
packages/web/src/state/sessionSelectors.types.ts:1:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/state/useActionResolution.ts:2:
  import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
packages/web/src/state/useAiRunner.ts:2:
  import { type ActionParams } from '@kingdom-builder/engine';
packages/web/src/state/useNextTurnForecast.ts:2:
  import { type PlayerSnapshotDeltaBucket } from '@kingdom-builder/engine';
packages/web/src/state/usePhaseProgress.helpers.ts:24:
  import type { EngineAdvanceResult } from '@kingdom-builder/engine';
```

### Translation (effect and content translators)

`rg --no-heading --line-number "@kingdom-builder/(engine|contents)" \
  packages/web/src/translation`

```
packages/web/src/translation/context/assetSelectors.ts:6:
  import { TRIGGER_INFO } from '@kingdom-builder/contents';
packages/web/src/translation/context/assets.ts:8:
  import { TRIGGER_INFO } from '@kingdom-builder/contents';
packages/web/src/translation/content/phased.ts:2:
  import { TRIGGER_INFO } from '@kingdom-builder/contents';
packages/web/src/translation/content/population.ts:1:
  import { type PopulationRoleId } from '@kingdom-builder/contents';
packages/web/src/translation/effects/evaluators/population.ts:1:
  import type { PopulationRoleId } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack.ts:1:
  import { type ResourceKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/resource.ts:1:
  import { Resource } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/resource.ts:1:
  import type { ResourceKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/stat.ts:1:
  import { type StatKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/statContext.ts:1:
  import { Stat } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/statContext.ts:1:
  import type { StatKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/types.ts:6:
  import type { ResourceKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/types.ts:6:
  import type { StatKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attack/registrySelectors.ts:7:
  } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/attackFormatterUtils.ts:1:
  import { type ResourceKey } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/land.ts:1:
  import { LAND_INFO } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/land.ts:1:
  import { SLOT_INFO } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/modifier.ts:1:
  import { RESOURCE_TRANSFER_ICON } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/modifier_helpers.ts:3:
  import type { DevelopmentDef } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/modifier_targets.ts:2:
  import type { ActionDef } from '@kingdom-builder/contents';
packages/web/src/translation/effects/formatters/population.ts:1:
  import type { PopulationRoleId } from '@kingdom-builder/contents';
packages/web/src/translation/effects/helpers.ts:1:
  import type { PopulationRoleId } from '@kingdom-builder/contents';
packages/web/src/translation/effects/registrySelectors.ts:5:
  } from '@kingdom-builder/contents';
```

### Tests (integration and contract suites)

`rg --no-heading --line-number "@kingdom-builder/(engine|contents)" tests`

```
tests/integration/action-effect-groups.test.ts:6:
  } from '@kingdom-builder/engine';
tests/integration/action-effect-groups.test.ts:9:
  import { Resource } from '@kingdom-builder/contents';
tests/integration/action-log-hooks.test.ts:2:
  import { createEngineSession } from '@kingdom-builder/engine';
tests/integration/action-log-hooks.test.ts:3:
  import { PHASES } from '@kingdom-builder/contents';
tests/integration/action-log-hooks.test.ts:3:
  import { GAME_START } from '@kingdom-builder/contents';
tests/integration/action-log-hooks.test.ts:3:
  import { RULES } from '@kingdom-builder/contents';
tests/integration/building-placement.test.ts:2:
  import { performAction } from '@kingdom-builder/engine';
tests/integration/building-stat-bonus.test.ts:6:
  } from '@kingdom-builder/engine';
tests/integration/dev-mode-start-config.test.ts:2:
  import { createEngineSession } from '@kingdom-builder/engine';
tests/integration/dev-mode-start-config.test.ts:13:
  } from '@kingdom-builder/contents';
tests/integration/edge-cases.test.ts:2:
  import { performAction } from '@kingdom-builder/engine';
tests/integration/fixtures.ts:1:
  import { createEngine } from '@kingdom-builder/engine';
tests/integration/fixtures.ts:1:
  import { getActionCosts } from '@kingdom-builder/engine';
tests/integration/fixtures.ts:12:
  } from '@kingdom-builder/contents';
tests/integration/fixtures.ts:13:
  import type { EngineContext } from '@kingdom-builder/engine';
tests/integration/fixtures.ts:15:
  import { PlayerState } from '@kingdom-builder/engine/state';
tests/integration/fixtures.ts:16:
  import { runEffects } from '@kingdom-builder/engine/effects';
tests/integration/happiness-tier-content.test.ts:6:
  } from '@kingdom-builder/contents';
tests/integration/phased-translation.test.ts:3:
  import { createEngine } from '@kingdom-builder/engine';
tests/integration/phased-translation.test.ts:4:
  import type { EngineContext } from '@kingdom-builder/engine';
tests/integration/phased-translation.test.ts:20:
  } from '@kingdom-builder/contents';
tests/integration/phased-translation.test.ts:21:
  import type { ResourceKey } from '@kingdom-builder/contents';
tests/integration/plunder-zero-gold.test.ts:3:
  import { Resource as CResource } from '@kingdom-builder/contents';
tests/integration/random-game-flow.test.ts:6:
  } from '@kingdom-builder/engine';
tests/integration/royal-decree-session.test.ts:2:
  import { createEngineSession } from '@kingdom-builder/engine';
tests/integration/royal-decree-session.test.ts:13:
  } from '@kingdom-builder/contents';
tests/integration/synthetic.ts:1:
  import { createEngine } from '@kingdom-builder/engine';
tests/integration/synthetic.ts:20:
  } from '@kingdom-builder/contents/config/builders';
tests/integration/synthetic.ts:24:
  } from '@kingdom-builder/contents/config/builderShared';
tests/integration/turn-cycle.test.ts:2:
  import { createEngine } from '@kingdom-builder/engine';
tests/integration/turn-cycle.test.ts:2:
  import { advance } from '@kingdom-builder/engine';
tests/types/session_contract.test.ts:17:
  } from '@kingdom-builder/engine';
```

## Backend protocol goals

### Metadata payload contract

- Provide a `GET /session/metadata` payload exposing canonical ids, icons,
  labels, and tier structures required by the overview, passive, and resource
  surfaces. Payload fields should mirror the selectors used by the current UI:
  `resources`, `stats`, `populationRoles`, `passives`, `phases`, and
  `overviewTokens`, each keyed by stable ids and carrying localization handles.
- Include enrichment flags indicating whether optional assets (icon emoji,
  background gradients, lore blurbs) are present so the UI can skip placeholder
  fallbacks when the backend is authoritative.
- Guarantee versioning via a `schemaVersion` and `contentRevision` pair so the
  client can invalidate caches when the backend registry changes.

### Registry bootstrap expectations

- The backend session bootstrap endpoint should return protocol-facing
  registries (engine action catalogues, development cards, passive definitions)
  as arrays of DTOs rather than exposing the raw content module namespace.
- Each registry DTO must supply the identifiers and references currently pulled
  from `@kingdom-builder/contents`: resource costs, focus tags, trigger ids,
  slot requirements, and passive tiers. Nested metadata should reference other
  DTO collections by id to keep the payload normalization explicit.
- Provide a checksum or `registryEtag` that clients can persist, enabling
  session rehydration without re-downloading full registries when the checksum
  matches the cached copy.

### Overview content stream

- Deliver a dedicated `overview` document containing hero copy, feature tokens,
  and section templates. This should pre-resolve token categories, icon ids,
  and ordering so the UI consumes ready-to-render DTOs.
- Allow optional overrides per player or session (e.g., developer mode tokens)
  by surfacing an `overrides` collection keyed by audience or feature flag. The
  web client can merge overrides with the base overview without importing
  content registries directly.
- Document fallback behavior for missing icons or copy. When the backend omits
  optional fields, the protocol contract should state which defaults are safe
  (plain text labels, neutral icons) so the UI avoids guessing from registries.

## Frontend modules slated for protocol types

- **Component surfaces**: `Overview.tsx`, action cards, overview token helpers,
  player panel modules, and stat utilities must swap engine and contents types
  for protocol DTOs (`ProtocolPlayerSnapshot`, `ProtocolOverviewToken`, etc.).
- **State hooks**: `sessionSdk.ts`, `useActionResolution`,
  `useNextTurnForecast`, `usePhaseProgress.helpers`, and related selectors
  should rely on protocol
  payload interfaces coming from the backend session client instead of direct
  engine imports.
- **Translation layer**: Effect formatters and translators need protocol-aware
  lookup tables (resource descriptors, population roles, trigger metadata)
  supplied by the API metadata payload rather than referencing contents enums.
- **Tests**: Integration suites should construct fixtures from protocol DTO
  builders so they validate contract compliance without touching engine or
  content packages.

## Migration checklist

- [ ] Metadata enrichment is available from the API and documented above.
- [ ] Frontend no longer imports `@kingdom-builder/contents` at runtime.
- [ ] Frontend no longer imports `@kingdom-builder/engine` at runtime.
- [ ] Test fixtures consume protocol DTO builders instead of content modules.
