# Resource Migration Project - COMPLETED

**Status:** ✅ Complete as of 2025-12-07

## Summary

The ResourceV2 migration unified all numeric game values (currencies, stats,
population roles) under a single resource system. All legacy patterns have been
removed and the codebase now uses ResourceV2 exclusively.

## What Changed

- All effects use `resourceId` parameter instead of legacy `key`
- All evaluators use `type: 'resource'` instead of `type: 'stat'` or
  `type: 'population'`
- Registry selectors use `resourceMetadataV2` for metadata lookups
- Test fixtures updated to use V2 resource IDs
