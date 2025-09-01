# Frontend Translation Architecture

## 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** The translation layer must obtain all resource/stat names and values from the Content domain so that wording adjusts automatically when content changes.
- **Tests may not rely on literals.** Translation tests should pull ids and expected values from content registries or mocks; content tweaks should not require test updates unless they reveal unsupported scenarios.

The web client converts raw engine definitions into player-facing text through a
layered translation system. The goal is to keep UI strings decoupled from engine
data so that new content can be introduced without touching the `Game` component
or other consumers.

## Effect Formatters

Effects are translated by registry-driven **formatters** located under
`packages/web/src/translation/effects`. Each effect formatter describes how to
summarize, describe and log a specific `{type, method}` pair.

Formatters register themselves with the factory when their module is imported:

```ts
registerEffectFormatter('resource', 'add', {
  summarize: ...,
  describe: ...,
  log: ...,
});
```

The factory applies the appropriate formatter for each effect. Adding support
for a new effect simply means creating a new formatter module and registering it
with `registerEffectFormatter`. The optional `log` handler formats effects in a
"this just happened" style for the game log.

Common verb helpers such as `gainOrLose` and `increaseOrDecrease` live in
`effects/helpers.ts` to keep wording consistent.

## Content Translators

Content such as actions, developments, buildings and land are handled by
**translators** registered via `registerContentTranslator` in
`packages/web/src/translation/content`.

Translators implement `summarize` and `describe` and may compose other
translators. For example, the development and building translators share the
`PhasedTranslator` to process phase-specific effects and are wrapped with the
`withInstallation` decorator to add the appropriate "On build" header. A
translator may optionally expose a `log` method for producing flat log lines.

Consumers call the generic `summarizeContent`, `describeContent` or
`logContent` factory functions which dispatch to the correct translator based on
the content type. Adding a new content type only requires implementing and
registering another translator.

## Extending

1. Create a formatter under `translation/effects/formatters` for new effect
   types and register it.
2. Implement a content translator class if a new top-level domain (e.g. a new
   card type) needs summaries or descriptions.
3. Register the translator with `registerContentTranslator` and expose it by
   importing the module in `translation/content/index.ts`.

## Logging helpers

State changes are derived through `snapshotPlayer` and `diffSnapshots` in
`translation/log.ts`. These utilities capture player state before and after an
effect resolves and emit human readable change strings such as
`Gold +2 (10→12)`. Phase headings draw from `triggerInfo`, which provides both a
`future` label for summaries (e.g. "On each Growth Phase") and a `past`
label for log entries ("Growth Phase").

This structure keeps translation logic isolated and makes the UI resilient to
engine and content changes.
