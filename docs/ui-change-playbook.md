# UI Change Playbook

Use this quick checklist whenever a task touches rendered UI or registry
metadata. It walks the data path from content packages through the React
contexts that surface translated strings.

## Checklist

1. **Update content definitions**
   - Apply edits under `packages/contents/src/**` so icons, labels, and
     descriptions stay data-driven.
   - Run `npm run generate:snapshots` (or the dev server) to refresh cached
     registry metadata whenever content changes.
2. **Confirm server bootstrap**
   - Verify the session pipeline in
     `packages/server/src/session/SessionManager.ts` pulls the updated metadata
     and exposes it through the registry payload returned to clients.
3. **Trace the client state**
   - Follow the registry hand-off inside
     `packages/web/src/state/sessionRegistries.ts` to ensure the store reflects
     the refreshed metadata.
   - Inspect `packages/web/src/contexts/RegistryMetadataContext.tsx` to confirm
     the React context provides the expected values to components.
4. **Validate translators**
   - Check `packages/web/src/translation/**` to see which translator modules
     format the metadata for UI copy, tooltips, or logs.
   - Update or add translators when new metadata properties require formatted
     text.

## Flow Overview

```
@kingdom-builder/contents (packages/contents/src/**)
        ↓ build + snapshot refresh
SessionManager (packages/server/src/session/SessionManager.ts)
        ↓ registry payload
sessionRegistries (packages/web/src/state/sessionRegistries.ts)
        ↓ context provider
RegistryMetadataContext
(packages/web/src/contexts/RegistryMetadataContext.tsx)
        ↓ translation dispatch
translation modules
(packages/web/src/translation/**)
        ↓
React UI components
```

Translators in `packages/web/src/translation/**` consume the metadata exposed by
`RegistryMetadataContext` to generate user-facing strings. Update the relevant
translator files whenever new metadata fields appear or copy rules change.
