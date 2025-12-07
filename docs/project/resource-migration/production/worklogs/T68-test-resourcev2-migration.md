# T68 – Test Pattern Migration to ResourceV2

## Summary

Migrated test files and fixtures to use unified ResourceV2 patterns instead of
legacy `type: 'population'` and `type: 'stat'` dependency/source types.

## Changes

### Source Files Modified

1. **`packages/web/src/translation/log/resourceSources/meta.ts`**
   - Renamed `renderPopulationMetaIcons` to `renderResourceMetaIcons`
   - Updated `META_ICON_RENDERERS` registry from `population:` to `resource:`

2. **`packages/web/src/utils/stats/descriptorRegistry.ts`**
   - Removed legacy `population` descriptor entry
   - Removed legacy `stat` descriptor entry
   - Removed unused `createRecordResolver` function
   - Simplified `resource` descriptor to use metadata-driven behavior only

### Test Files Migrated & Renamed

1. **`stat-descriptor-registry.test.ts` → `resource-source-descriptors.test.ts`**
   - Added `populationResourceId` and `statResourceId` (V2 format IDs)
   - Added `valuesV2` to player snapshot
   - Added `resourceMetadataV2` to session snapshot
   - Updated `dependsOn` array to use `type: 'resource'` with V2 IDs
   - Updated `formatKindLabel` calls to use `'resource'` kind
   - Renamed describe block to `'resource source descriptors'`

2. **`stat-breakdown.test.ts` → `resource-breakdown.test.ts`**
   - Added `populationResourceId` (V2 format ID)
   - Added `valuesV2` and `resourceMetadataV2` to fixtures
   - Updated dependencies to use `type: 'resource'`
   - Updated `kind: 'population'` to `kind: 'resource'`
   - Renamed describe block to `'resource breakdown summary'`

3. **`log-source-icons.test.ts`**
   - Changed scenario from `name: 'population'` to `name: 'resource'`
   - Updated to use `selectResourceDescriptor` instead of
     `selectPopulationDescriptor`
   - Changed `type: 'population' as const` to `type: 'resource' as const`

4. **`fixtures/syntheticTaxLog.ts`**
   - Updated meta source `type: 'population'` to `type: 'resource'`

5. **`helpers/actionsPanel/contentBuilders.ts`**
   - Changed effect `type: 'population'` to `type: 'resource'`
   - Updated params from `{ role: ... }` to `{ resourceId: ..., change: ... }`

## Test Results

All tests pass after migration:
- Engine: 282 passed
- Protocol: 19 passed
- Integration: 24 passed
- Web: 370 passed
- Server: 221 passed

## Prime Directive Adherence

All changes follow the ResourceV2 prime directive:
- No ID parsing to determine semantic meaning
- Metadata-driven display behavior (e.g., `displayAsPercent`)
- Legacy descriptors removed (not maintained alongside new patterns)
- All dependencies use `type: 'resource'` with proper V2 IDs
