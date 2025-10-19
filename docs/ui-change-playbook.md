# UI Change Playbook

Use this checklist whenever an assignment adjusts UI metadata, visuals, or any
copy that depends on registry definitions. Follow the flow end-to-end so the
content source, server bootstrap, and React consumers stay aligned.

## Checklist

1. **Update content packages**
   - Edit the relevant definitions under `packages/contents/src/**` and ensure
     icons, names, descriptions, and other metadata live in content rather than
     JSX fallbacks.
   - Regenerate content-driven snapshots (`npm run generate:snapshots`) and
     review the diff in
     `packages/web/src/contexts/defaultRegistryMetadata.json`.
2. **Confirm the server bootstrap**
   - Inspect
     [`packages/server/src/session/SessionManager.ts`](../packages/server/src/session/SessionManager.ts)
     to verify the session payload exports the expected registries and fields.
   - When adding new metadata, extend the bootstrap so the session response
     forwards the content data without hardcoding values.
3. **Trace the client data flow**
   - Follow
     [`packages/web/src/state/sessionRegistries.ts`](../packages/web/src/state/sessionRegistries.ts)
     to ensure the client cache stores the updated registry metadata.
   - Review
     [`packages/web/src/contexts/RegistryMetadataContext.tsx`](../packages/web/src/contexts/RegistryMetadataContext.tsx)
     so hooks and components receive the new fields. Update derived selectors or
     context defaults if new properties are introduced.
4. **Surface metadata in translators**
   - Track where the metadata enters the formatter layer inside
     `packages/web/src/translation/**`. Add or adjust translators so
     `summarize`, `describe`, and log helpers consume the latest fields.
   - Confirm downstream React components read translated strings instead of
     embedding literals.
5. **Validate the UI**
   - Run `npm run test:ui` to confirm Playwright snapshots reflect the new
     metadata.
   - Manually smoke-test any feature views that rely on the updated registries.

## Flow overview

```mermaid
flowchart TD
    Contents[packages/contents/src/**] --> SessionManager[SessionManager.ts\n(bootstrap session payload)]
    SessionManager --> Registries[sessionRegistries.ts\n(client registry store)]
    Registries --> Context[RegistryMetadataContext.tsx\n(React provider)]
    Context --> Translators[translation/**\n(format metadata to copy)]
    Translators --> UI[React features]
```

Translators inside `packages/web/src/translation/**` pull metadata from the
context, convert it to localized copy, and feed those strings into React
components. Keep this path in sync so updates to content definitions cascade
cleanly through the entire UI.
