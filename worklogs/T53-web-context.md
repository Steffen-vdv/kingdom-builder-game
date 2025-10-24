# Resource Migration MVP - P2 - T53 - Web translation context ResourceV2 ingestion

## Summary

- Refactored the translation context builder to clone ResourceV2 catalogs, metadata descriptors, and player value/bounds snapshots from session payloads.
- Exposed a new `resourceV2` facade on the translation context with metadata selectors and signed gain helpers backed by the shared formatter utilities.
- Preserved legacy resource/stat accessors and stubs to keep existing UI code paths functional during the migration window.

## Testing

- `npm run format`
- `npm run lint`
- `npm run check`
