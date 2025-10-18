# UI Metadata Pipeline

Icons, labels, and other registry metadata originate in
`@kingdom-builder/contents` and flow through the server/session bootstrapper
before React renders them. Use this map when updating visuals so you change the
content source instead of patching UI fallbacks.

```
packages/contents
   │  (source icons, names, descriptions)
   ▼
packages/server/src/session/SessionManager.ts
   │  (loads registries into the session payload)
   ▼
packages/web/src/state/sessionRegistries.ts
   │  (stores registry metadata in the client cache)
   ▼
packages/web/src/contexts/RegistryMetadataContext.tsx
   │  (provides metadata to hooks/components)
   ▼
Translators & React components
   (e.g., packages/web/src/translation/**, feature UIs)
```

Whenever any upstream content changes, immediately rerun the automation that
keeps the visuals in sync:

- `npm run generate:snapshots` refreshes
  `packages/web/src/contexts/defaultRegistryMetadata.json` so local development
  and snapshot tests match the new content.
- `npm run test:ui` replays the Playwright suite to confirm the rendered UI
  reflects the updated metadata.

Skipping these steps leaves the UI with stale icons or labels even if the JSX is
correct. Always fix the content definition first, regenerate snapshots, and
re-run Playwright before shipping metadata edits.
