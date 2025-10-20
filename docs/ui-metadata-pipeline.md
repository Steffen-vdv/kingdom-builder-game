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

Whenever upstream content changes, rebuild the contents workspace (run `npm run
predev:build-contents` or start the dev server) so the latest registries flow
through the pipeline. Document the verification step in your PR notes when UI
copy, layout, or visuals change.

Skipping these steps leaves the UI with stale icons or labels even if the JSX is
correct. Always fix the content definition first and confirm the registries
reflect the new metadata before shipping UI edits.
