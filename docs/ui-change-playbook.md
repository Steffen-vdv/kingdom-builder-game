# UI Change Playbook

Use this quick checklist before touching any visual surface. It confirms that
content updates flow from source registries through the server bootstrap to the
React translators that render metadata.

## Checklist

1. **Patch the content source first**
   - Locate the relevant definitions under `packages/contents/src/**`.
   - Update icons, labels, descriptions, or other metadata in the registry
     modules instead of patching React props.
2. **Confirm the session bootstrap**
   - Inspect `packages/server/src/session/SessionManager.ts` to ensure the
     updated registries load into the session payload.
   - If you add new registry fields, extend the session payload interface and
     verify the bootstrap exports them.
3. **Trace the client state wiring**
   - Follow the data handoff in
     `packages/web/src/state/sessionRegistries.ts` to confirm the client cache
     stores the new metadata.
   - Make sure selectors or helpers that read the registries cover the new
     fields.
4. **Verify context and translators**
   - Check `packages/web/src/contexts/RegistryMetadataContext.tsx` so providers
     expose the updated metadata to UI consumers.
   - Review `packages/web/src/translation/**` translators to ensure they pick up
     the new fields when summarizing or describing content.
5. **Regenerate automation and tests**
   - Run `npm run generate:snapshots` and `npm run test:ui` to refresh cached
     metadata and confirm the rendered UI reflects the change.

## Flow reference

```mermaid
flowchart TD
    Contents[packages/contents/src/**\n(registry definitions)] --> Session
    Session[packages/server/src/session/SessionManager.ts\n(session bootstrap)]
        --> State
    State[packages/web/src/state/sessionRegistries.ts\n(client cache)] --> Context
    Context[packages/web/src/contexts/RegistryMetadataContext.tsx\n(React provider)]
        --> Translators
    Translators[packages/web/src/translation/**\n(format metadata into copy)]
        --> UI[React components]
```

Translators convert registry metadata into player-facing copy.
Account for new or renamed fields inside the relevant formatter modules
under `packages/web/src/translation/**` so summaries and descriptions stay
accurate.
