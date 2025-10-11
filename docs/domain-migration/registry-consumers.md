# Domain Migration - T11-2-1 - Registry consumers audit

## Overview surface

### `packages/web/src/Overview.tsx`

- Reads `OVERVIEW_CONTENT.hero` for `badgeIcon`, `badgeLabel`, `title`, `intro`, `paragraph`, and a `tokens` record whose values are rendered inside `<strong>` tags. Assumes all hero strings exist and tokens map to readable labels.
- Defaults sections/tokens from `OVERVIEW_CONTENT.sections` and `OVERVIEW_CONTENT.tokens`. Expects `sections` entries to carry `id`, `kind`, `icon`, `title`, `span`, plus either `paragraphs` (array of tokenized strings) or `items` with `icon` keys matching token definitions.
- Combines hero tokens with resolved icon tokens from `createOverviewSections`. Missing icons fall back to `undefined` but text rendering assumes token keys exist.

### `packages/web/src/components/overview/sectionsData.ts`

- Treats incoming content as `OverviewSectionTemplate` and token candidates as `OverviewTokenCandidates` from contents.
- Calls `mergeTokenSources` to overlay runtime overrides onto content-supplied candidates. Requires category names to match `OverviewTokenCategoryName` union and candidate lists to be arrays or single strings.
- Builds `OverviewSectionDef` entries with `icon` values resolved to React nodes. Falls back to `null` if an icon id is missing from the resolved icon map.

### `packages/web/src/components/overview/overviewTokenUtils.ts`

- Imports `ACTIONS`, `LAND_INFO`, `SLOT_INFO`, `RESOURCES`, `PHASES`, `POPULATION_ROLES`, and `STATS`. Expects:
  - `ACTIONS` to behave like a registry with `.keys()`, `.has()`, and `.get()` returning objects that may include `icon`.
  - `LAND_INFO`/`SLOT_INFO` to provide `{ icon?: ReactNode }` for static tokens.
  - `PHASES` to be an array with `{ id, icon }` for lookup by `PhaseId`.
  - `RESOURCES`, `STATS`, and `POPULATION_ROLES` to be records keyed by id containing optional `icon` properties.
- Provides `CATEGORY_CONFIG` merging runtime overrides with defaults. Missing icons result in `undefined`, and static fallback categories rely on `LAND_INFO`/`SLOT_INFO` blending content metadata with UI constants.
- `createDefaultTokenConfig` seeds every known id with itself, so registries must list every token a UI might request.

### `packages/web/src/components/overview/overviewTokens.ts`

- Relies on `CATEGORY_CONFIG` order from `overviewTokenUtils`, so adding categories in contents requires updating both files.
- Honors overrides by preferring explicit entries; otherwise uses resolved icons or assigns `undefined` placeholders to preserve token keys.

## Player panel components

### `packages/web/src/components/player/PopulationInfo.tsx`

- Uses `POPULATION_ROLES` for button icons, labels, and descriptions; expects every role key referenced in `player.population` to exist.
- Reads `POPULATION_INFO` and `POPULATION_ARCHETYPE_INFO` for summary hover cards. Assumes both provide `icon`, `label`, and `description`.
- Reads `STATS` for icon, label, and `description`. Forecast and breakdown logic assumes `STATS[statKey]` exists for every stat shown; missing entries abort hover cards.

### `packages/web/src/components/player/LandDisplay.tsx`

- Pulls `LAND_INFO`, `SLOT_INFO`, and `DEVELOPMENTS_INFO` for icons/labels in hover states. Expects these objects to expose `icon`/`label` strings.
- When a land slot is empty, formats tooltips with `SLOT_INFO.icon` and `.label`; lacking these results in sparse tooltips.

### `packages/web/src/components/player/PassiveDisplay.tsx`

- Imports `PhaseId` enum to translate the upkeep phase label from `translationContext.phases`. Assumes `PhaseId.Upkeep` exists and matches a phase entry.
- Treats `translationContext.assets.passive` as the fallback provider of passive `icon`/`label` when metadata omits them.

### `packages/web/src/components/player/ResourceBar.tsx`

- Iterates `Object.keys(RESOURCES)` as the authoritative list of resource keys. Expects each entry to include `icon`, `label`, and `description` for hover copy.
- Highlights `happinessKey` from rule snapshot by reading `RESOURCES[happinessKey]`; assumes the key is always registered. Missing entries degrade tier headers and hover titles.

### `packages/web/src/components/player/ResourceButton.tsx`

- Looks up `RESOURCES[resourceKey]` for icon/label. Missing icons lead to blank buttons but UI still renders value text.

### `packages/web/src/components/player/buildTierEntries.ts`

- Requires `PASSIVE_INFO.icon` for permanent/ongoing markers and `RESOURCES[tieredResourceKey].icon` for range labels.
- Calls content-driven effects through `describeEffects`; expects tier previews, when present, to mirror action/development effect structures.
- Mixes passive metadata (`PASSIVE_INFO`) with derived tier formatting constants.

### `packages/web/src/components/game/GameConclusionOverlay.tsx`

- Resolves win-condition icons by treating `display.icon` as a resource key before falling back to literal strings. Assumes RESOURCES contains matching icons for icon keys.

## Actions surfaces

### `packages/web/src/components/actions/utils.ts`

- Uses `RESOURCES` solely for key validation: `isResourceKey` checks membership before rendering "Need" messages with icon+label. Missing resource ids skip iconized fallback.

### `packages/web/src/components/actions/DevelopOptions.tsx`

- Imports `SLOT_INFO` to format land requirements and hover copy. Requires `icon` and `label` fields.

### `packages/web/src/components/actions/DemolishOptions.tsx`

- References `Focus` type for TypeScript narrowing; no runtime metadata dependency beyond ensuring focus enums stay aligned.

### `packages/web/src/components/actions/GenericActionCard.tsx`

- Uses `ResourceKey` type to type action cost resource ids. No runtime metadata usage, but type safety presumes resource registry stays authoritative.

### `packages/web/src/components/actions/ActionCard.tsx`

- Accepts `Focus` to select gradients via `FOCUS_GRADIENTS`. Missing or new focus ids must be added to gradients to avoid default styling.

### `packages/web/src/components/actions/focusGradients.ts`

- Hard-codes gradients for known `Focus` ids (`economy`, `aggressive`, `defense`, `other`). Unknown ids fall back to the `default` gradient; introducing new focus types requires updating this map.

### `packages/web/src/components/actions/populationHelpers.ts`

- Depends on `POPULATION_INFO.icon` and `POPULATION_ROLES` metadata for icons/labels and role descriptions. Gracefully handles missing registry entries via try/catch but returns empty icons.
- Reads `POPULATIONS` registry to gather upkeep and action effects; expects `get` and `entries` to behave like a Map.
- Notes: mixes role info from both POPULATION_ROLES and POPULATIONS—migration should ensure both sources stay synchronized or consolidate them.

### `packages/web/src/components/actions/RaisePopOptions.tsx`

- Combines `POPULATION_ROLES` (icon/label) with `POPULATIONS` (detail definitions). Assumes every candidate role id resolves in both collections. Missing entries degrade hover copy but actions remain callable.

### `packages/web/src/components/actions/ActionsPanel.tsx`

- Renders action cost using `RESOURCES[actionCostResource].icon`; assumes the action cost resource id always exists in metadata.
- Casts `focus` string fields into the `Focus` union. Unknown focus ids propagate to `focusGradients` which may not include entries.

## Utility modules

### `packages/web/src/utils/getRequirementIcons.ts`

- Maps evaluator requirements to icons using `STATS` and `POPULATION_ROLES`. Icons default to empty strings when metadata lacks an icon.
- Registry currently only handles `evaluator:compare`; future requirement types must register additional getters.

### `packages/web/src/utils/stats.ts`

- Treats `STATS` as the definitive source for labels, icons, and description copy when building stat breakdowns. If a stat key is missing, the breakdown returns an empty array.

### `packages/web/src/utils/stats/passiveFormatting.ts`

- Uses `PASSIVE_INFO.icon` for ongoing markers and `formatPassiveRemoval` plus `PhaseStepId` to compose removal text. Assumes removal ids map to known phase steps for proper formatting.

### `packages/web/src/utils/stats/descriptorRegistry.ts`

- Resolves labels/icons via `POPULATION_ROLES`, `RESOURCES`, `STATS`, and `PASSIVE_INFO`. Falls back to ids when metadata is absent.
- Blends registry data (`translationContext.*`) with static info (e.g., `PASSIVE_INFO`)—callers rely on both staying aligned.

### `packages/web/src/utils/stats/triggerLabels.ts`

- Reads `TRIGGER_INFO` (icon, `past`, `future` labels). Defaults to trigger id if metadata is missing.

### `packages/web/src/utils/stats/format.ts`

- Formats phase/step labels using `PHASES` array, expecting each phase to list `steps` with optional `icon`/`title`. Falls back to title-cased ids when lookups fail.

## Migration risks & blending notes

- Several modules mix registry data with static helper constants (e.g., `LAND_INFO`, `SLOT_INFO`, `PASSIVE_INFO`). Migration should clarify which fields stay in the metadata provider versus local UI defaults to avoid drift.
- UI loops commonly treat registry objects as exhaustive (`Object.keys(RESOURCES)`, `POPULATIONS.entries()`), so the future provider must remain iterable and include all in-game ids.
- Many consumers expect optional icons/labels but fall back to bare ids or empty strings. Validate that downstream formatting tolerates missing metadata to prevent blank UI elements.
- Type-only imports (`Focus`, `ResourceKey`, `PopulationRoleId`) enforce compile-time alignment with registry keys. Adding new ids requires updating helper lookups such as `focusGradients`.
