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

- `npm run generate:snapshots` refreshes cached registry metadata so both
  metadata and rendered output stay aligned. Paste the command output into your
  PR notes whenever UI copy, layout, or visuals change.

Skipping these steps leaves the UI with stale icons or labels even if the JSX is
correct. Always fix the content definition first and regenerate the snapshots
before shipping metadata edits.
