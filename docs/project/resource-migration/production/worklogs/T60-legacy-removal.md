# Resource Migration MVP - P2 - T60 - Legacy Resource Handler Removal

## Summary

- Removed the obsolete `resource_add`, `resource_remove`, and `resource_transfer` engine handlers that depended on legacy resource/stat keys now superseded by the ResourceV2 pipeline.
- Confirmed the core effect registry and downstream modules exclusively reference the ResourceV2 handler set, with no remaining imports targeting the deleted files.
- Noted the historical reference in the runtime snapshot worklog to avoid confusion after the file cleanup.

## Touched Files

- packages/engine/src/effects/resource_add.ts (removed)
- packages/engine/src/effects/resource_remove.ts (removed)
- packages/engine/src/effects/resource_transfer.ts (removed)
- docs/project/resource-migration/production/worklogs/T60-legacy-removal.md

## Tests

- npm run format
- npm run lint
- npm run check

## Follow-ups

- Audit documentation for any other legacy handler references once the remaining ResourceV2 rollouts retire the temporary bridging utilities.
