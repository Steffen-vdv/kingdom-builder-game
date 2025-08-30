# Frontend Translation Architecture

The web client converts raw engine definitions into player-facing text through a
layered translation system. The goal is to keep UI strings decoupled from engine
data so that new content can be introduced without touching the `Game` component
or other consumers.

## Effect Formatters

Effects are translated by registry-driven **formatters** located under
`packages/web/src/translation/effects`. Each effect formatter describes how to
summarize and describe a specific `{type, method}` pair.

Formatters register themselves with the factory when their module is imported:

```ts
registerEffectFormatter('resource', 'add', {
  summarize: ...,
  describe: ...,
});
```

The factory applies the appropriate formatter for each effect. Adding support
for a new effect simply means creating a new formatter module and registering it
with `registerEffectFormatter`.

Common verb helpers such as `gainOrLose` and `increaseOrDecrease` live in
`effects/helpers.ts` to keep wording consistent.

## Content Translators

Content such as actions, developments, buildings and land are handled by
**translators** registered via `registerContentTranslator` in
`packages/web/src/translation/content`.

Translators implement `summarize` and `describe` and may compose other
translators. For example, the development and building translators share the
`PhasedTranslator` to process phase-specific effects and are wrapped with the
`withInstallation` decorator to add the appropriate "On build" header.

Consumers call the generic `summarizeContent` or `describeContent` factory
functions which dispatch to the correct translator based on the content type.
Adding a new content type only requires implementing and registering another
translator.

## Extending

1. Create a formatter under `translation/effects/formatters` for new effect
   types and register it.
2. Implement a content translator class if a new top-level domain (e.g. a new
   card type) needs summaries or descriptions.
3. Register the translator with `registerContentTranslator` and expose it by
   importing the module in `translation/content/index.ts`.

This structure keeps translation logic isolated and makes the UI resilient to
engine and content changes.
