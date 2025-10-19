# Text Formatting & Translation Guide

This guide documents the web translation pipeline and the utilities that keep
player-facing text consistent across Kingdom Builder. Refer to it before adding
any new strings in the web client, engine-derived logs, or supporting tests. For
the mandatory workflow summary, start with
[`docs/agent-quick-start.md`](agent-quick-start.md) and return here for the full
inventories once the checklist in Section 0 is complete.

## 0. Before Writing Text

Follow this workflow before authoring new copy or extending translators:

1. Locate an existing translator or formatter that already matches your
   mechanic. Use the inventories in [Section 2](#2-content-translator-inventory)
   and [Section 3](#3-effect-formatter-inventory) before introducing new files.
   If a handler exists, extend it instead of forking the phrasing.
2. Reuse canonical keywords, icons, and helpers from
   [Section 4](#4-canonical-keywords-icons--helper-utilities). Icons, labels,
   and descriptions are defined in `@kingdom-builder/contents` (see
   [`packages/contents`](../packages/contents)), loaded into active sessions by
   [`SessionManager.ts`](../packages/server/src/session/SessionManager.ts), and
   exposed to React components through
   [`RegistryMetadataContext`](../packages/web/src/contexts/RegistryMetadataContext.tsx).
   Do not invent new emoji or verbs when the tables already provide an approved
   option.
3. Match the required voice for each output mode:
   - **Summary** — terse, present-tense fragments that read as bullet points.
   - **Description** — complete sentences in present tense that explain cause
     and effect.
   - **Log** — past-tense statements that recount what just happened; keep them
     chronological and free of UI jargon.

### Implementation checklist

Use these prompts while developing and when filling out the PR template:

1. Link the translator(s) or formatter(s) you extended from the inventories in
   [Section 2](#2-content-translator-inventory) and
   [Section 3](#3-effect-formatter-inventory) so reviewers can audit reuse.
2. Enumerate every canonical keyword, icon, or helper you touched from
   [Section 4](#4-canonical-keywords-icons--helper-utilities) to prove you
   pulled from the approved tables.
3. When a visual surface needs new icons, labels, or descriptions, update the
   relevant definitions in `@kingdom-builder/contents` and rerun
   `npm run test:ui` instead of patching fallback metadata in `packages/web`.
4. Confirm that you reviewed the Summary, Description, and Log voices for each
   affected surface and adjusted copy to match the definitions above.

> **Quick reference — paste into your PR description**
>
> - [ ] Linked the translator(s)/formatter(s) reused, referencing Sections 2–3.
> - [ ] Listed every canonical keyword/icon/helper touched from Section 4.
> - [ ] Updated `@kingdom-builder/contents` (not web fallbacks) for new icons,
>       labels, or descriptions and reran `npm run test:ui`.
> - [ ] Confirmed Summary/Description/Log voices were audited for affected UI.

## 1. Translation Pipeline Overview

The translation layer lives in `packages/web/src/translation` and is composed of
three tiers that build on one another:

1. **Effect formatters** describe individual engine effects. They are
   registered via `registerEffectFormatter` in
   [`effects/factory.ts`](../packages/web/src/translation/effects/factory.ts) and
   translate an `{ type, method }` pair into text for three modes:
   - `summarize` → short bullet points rendered on cards and list views.
   - `describe` → detailed breakdowns used on hover tooltips, modal bodies, and
     other expanded UI states.
   - `log` → flattened strings or nested summaries that the action log renders.
2. **Evaluator formatters** decorate nested effects produced by dynamic
   evaluators (per-development, per-population, etc.). They reuse the same
   registry pattern exposed by
   [`effects/factory.ts`](../packages/web/src/translation/effects/factory.ts).
3. **Content translators** (actions, buildings, developments, lands, etc.)
   orchestrate effect formatters into full card descriptions. They are
   registered via `registerContentTranslator` in
   [`content/factory.ts`](../packages/web/src/translation/content/factory.ts) and
   expose `summarize`, `describe`, and optional `log` functions via the
   `ContentTranslator` interface defined in
   [`content/types.ts`](../packages/web/src/translation/content/types.ts).

Consumers pick the appropriate mode through the factory helpers:

- `summarizeContent` for compact previews such as the action tray and quick
  lookup caches in [`ActionsPanel.tsx`](../packages/web/src/components/actions/ActionsPanel.tsx).
- `describeContent` for detailed overlays (e.g.,
  [`LandDisplay.tsx`](../packages/web/src/components/player/LandDisplay.tsx),
  [`BuildingDisplay.tsx`](../packages/web/src/components/player/BuildingDisplay.tsx)).
- `logContent` for action resolution messages (see
  [`GameContext.tsx`](../packages/web/src/state/GameContext.tsx)).

When adding a new UI surface, decide whether the reader needs a quick summary,
a full explanation, or a chronological log entry and call the matching helper.

### 1.1 Summary partitioning & hoisting

`splitSummary` in
[`content/partition.ts`](../packages/web/src/translation/content/partition.ts)
separates effect bullet points from longer narrative descriptions. Translators
can mark entries with `_desc` to push them into the narrative section, and with
`_hoist` to bubble items above wrappers like the "On build" header applied by
[`content/decorators.ts`](../packages/web/src/translation/content/decorators.ts).

## 2. Content Translator Inventory

| Translator             | Module                                                                                   | Notes                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Actions                | [`content/action.ts`](../packages/web/src/translation/content/action.ts)                 | Composes resolved action effects and effect groups. Honors role-specific options. |
| Buildings              | [`content/building.ts`](../packages/web/src/translation/content/building.ts)             | Wraps phased definitions and respects installation wrappers.                      |
| Developments           | [`content/development.ts`](../packages/web/src/translation/content/development.ts)       | Merges synthetic phase data before delegating to the phased translator.           |
| Lands                  | [`content/land.ts`](../packages/web/src/translation/content/land.ts)                     | Surface-level land summary and per-development descriptions.                      |
| Phased content         | [`content/phased.ts`](../packages/web/src/translation/content/phased.ts)                 | Shared helper translating per-phase triggers using effect formatters.             |
| Installation decorator | [`content/decorators.ts`](../packages/web/src/translation/content/decorators.ts)         | Adds the canonical "On build" wrapper and hoist handling.                         |
| Action log hooks       | [`content/actionLogHooks.ts`](../packages/web/src/translation/content/actionLogHooks.ts) | Rewrites option labels when effect groups fire during action resolution.          |

Consult the translator above before creating new files—most content fits one of
these pathways or can be extended via existing decorators.

## 3. Effect Formatter Inventory

Effect formatters live under `effects/formatters`. Reuse these modules instead
of rephrasing the same mechanic elsewhere.

| Formatter        | Module                                                                                                                                                                                    | Handles                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Actions          | [`effects/formatters/action.ts`](../packages/web/src/translation/effects/formatters/action.ts)                                                                                            | Adding/removing/unlocking/performing actions.                                                            |
| Attacks          | [`effects/formatters/attack.ts`](../packages/web/src/translation/effects/formatters/attack.ts) & [`effects/formatters/attack`](../packages/web/src/translation/effects/formatters/attack) | Army, building, stat, and resource attack variants plus on-damage summaries.                             |
| Buildings        | [`effects/formatters/building.ts`](../packages/web/src/translation/effects/formatters/building.ts)                                                                                        | Gain/remove/building slot interactions.                                                                  |
| Developments     | [`effects/formatters/development.ts`](../packages/web/src/translation/effects/formatters/development.ts)                                                                                  | Create/destroy/toggle development slots.                                                                 |
| Land slots       | [`effects/formatters/land.ts`](../packages/web/src/translation/effects/formatters/land.ts)                                                                                                | Slot count adjustments and till bonuses.                                                                 |
| Modifiers        | [`effects/formatters/modifier.ts`](../packages/web/src/translation/effects/formatters/modifier.ts)                                                                                        | Result modifiers, stacking hooks, and evaluation context. Uses helper utilities for consistent phrasing. |
| Modifier helpers | [`effects/formatters/modifier_helpers.ts`](../packages/web/src/translation/effects/formatters/modifier_helpers.ts)                                                                        | Canonical "Whenever it grants…" clauses, result labels, and percent math.                                |
| Transfer helpers | [`effects/formatters/transfer_helpers.ts`](../packages/web/src/translation/effects/formatters/transfer_helpers.ts)                                                                        | Resolves action labels for resource transfer modifiers.                                                  |
| Passives         | [`effects/formatters/passive.ts`](../packages/web/src/translation/effects/formatters/passive.ts)                                                                                          | Passive duration labels, phase detection, and nested summaries.                                          |
| Population       | [`effects/formatters/population.ts`](../packages/web/src/translation/effects/formatters/population.ts)                                                                                    | Role icons/labels and movement verbs.                                                                    |
| Resources        | [`effects/formatters/resource.ts`](../packages/web/src/translation/effects/formatters/resource.ts)                                                                                        | Gain/lose/transfer resource amounts with signed values.                                                  |
| Stats            | [`effects/formatters/stat/index.ts`](../packages/web/src/translation/effects/formatters/stat/index.ts)                                                                                    | Flat and percent stat adjustments keyed to `STATS`.                                                      |

Evaluator formatters live under `effects/evaluators` and provide consistent
suffixes like "per 🧩 Development" (see
[`effects/evaluators/development.ts`](../packages/web/src/translation/effects/evaluators/development.ts) and
[`effects/evaluators/population.ts`](../packages/web/src/translation/effects/evaluators/population.ts)).

### 3.1 Percent & Stat Presentation Map

Stat copy for summaries, descriptions, and logs runs through the same
formatter-plus-utility pairing:

- [`effects/formatters/stat/index.ts`](../packages/web/src/translation/effects/formatters/stat/index.ts)
  registers the `stat:add`, `stat:remove`, and `stat:add_pct` handlers. The
  summary and description branches call helpers such as
  `formatStatSummarySubject` and `resolveStatDescriptionParts` so cards and
  hovercards render identical icon/label combinations when `summarizeEffects`
  or `describeEffects` wrap the effect list.
- [`utils/stats/format.ts`](../packages/web/src/utils/stats/format.ts)
  centralises percent-aware math via `statDisplaysAsPercent` and
  `formatStatValue`. Any component that displays raw stat values (growth phase
  inspectors, damage calculators, etc.) should call `formatStatValue` so the
  percent flag defined in contents drives the UI instead of duplicating the
  conversion logic.

Because content translators (`ActionTranslator.log`,
`PhasedTranslator.summarize`, `PhasedTranslator.describe`, etc.) funnel their
effect arrays through `summarizeEffects`, `describeEffects`, and `logEffects`,
the same formatter is responsible for card bullets, tooltip sentences, and
action-resolution logs. When a new stat output mode needs bespoke log text,
extend the corresponding formatter with a `log` implementation so `logEffects`
can pick it up without hand-written component patches.

#### Worked example — Growth absorption tuning

Suppose a Growth phase card increases absorption by percentage. Update the
`stat:add_pct` formatter so the summary prints `🛡️ +50% Absorption` (icon +
signed percent) and the description resolves to `🛡️ +50% Absorption damage
reduction` or similar. With that formatter in place:

1. Cards pull the bullet via `PhasedTranslator.summarize`, which delegates to
   `summarizeEffects`.
2. Hovercards/tooltips reuse the same effect list through
   `PhasedTranslator.describe` → `describeEffects`.
3. Resolution logs (including `ActionTranslator.log` and any phased log wrapper)
   call `logEffects`. Add a `log` branch to `stat:add_pct` if the log needs past-
   tense phrasing; otherwise the shared handler keeps the three surfaces aligned
   automatically.

Whenever the percent should appear on readouts outside of translators (for
example, combat previews), make sure the consumer uses
`formatStatValue('absorption', value, assets)` so any `displayAsPercent` or
`format.percent` flag defined in contents propagates everywhere.

## 4. Canonical Keywords, Icons, & Helper Utilities

- **General verbs** — `gainOrLose`, `increaseOrDecrease`, and `signed` in
  [`effects/helpers.ts`](../packages/web/src/translation/effects/helpers.ts)
  produce the preferred wording for deltas. Always pipe numeric changes through
  these helpers before concatenating strings.
- **Action labels** — `formatActionLabel` and `formatActionChangeSentence` in
  [`effects/formatters/action.ts`](../packages/web/src/translation/effects/formatters/action.ts)
  output the icon-first bullets and sentence-case gain/lose copy used across
  action summaries, descriptions, and logs. Reuse them instead of hardcoding
  unlock/remove phrasing.
- **Development slots** — `renderDevelopmentChange` in
  [`effects/formatters/development.ts`](../packages/web/src/translation/effects/formatters/development.ts)
  centralises icon-first summaries, full-sentence descriptions, and log copy
  for adding or removing developments. Import it when formatting new
  development effects to keep the verbs consistent.
- **Result modifier clauses** — The modifier helpers in
  [`effects/formatters/modifier_helpers.ts`](../packages/web/src/translation/effects/formatters/modifier_helpers.ts)
  standardise phrases such as "Whenever it grants resources" and handle
  percent-based math and icon fallbacks.
- **Resource transfers** —
  [`effects/formatters/transfer_helpers.ts`](../packages/web/src/translation/effects/formatters/transfer_helpers.ts)
  resolves action labels and clause targets so modifiers describe the correct
  source ("affected actions", "resource transfers", etc.).
- **Passive longevity** — The passive formatter automatically renders
  "⏳ Until your next …" headers, detects phase icons, and merges manual labels
  (`durationLabel`, `durationIcon`) using
  [`resolveDurationMeta`](../packages/web/src/translation/effects/formatters/passive.ts).
  Reuse this formatter instead of rephrasing passive timers.
- **Cost labels & upkeep** — `renderCosts` in
  [`translation/render.tsx`](../packages/web/src/translation/render.tsx) applies
  the canonical "Free" label, uses `RESOURCES` for icons, and prefixes upkeep
  with the `BROOM_ICON`. Let UI components rely on this renderer rather than
  duplicating cost strings.
- **Skip messaging** — Use `describeSkipEvent` in
  [`utils/describeSkipEvent.ts`](../packages/web/src/utils/describeSkipEvent.ts)
  to explain skipped steps. It already aggregates sources and produces the
  "Skipped" summary consumed by the log view.
- **Generic icons** — `GENERAL_RESOURCE_ICON` and related glyphs live in
  [`web/src/icons/index.ts`](../packages/web/src/icons/index.ts) and are reused
  by modifier helpers to avoid ad-hoc emoji choices.
- **Phase triggers** — `TRIGGER_INFO` from contents (see
  [`content/decorators.ts`](../packages/web/src/translation/content/decorators.ts))
  contains the approved "On build" / "On each" phrasing. Use it when writing new
  trigger copy.
- **Stat presentation** — See
  [Section 3.1](#31-percent--stat-presentation-map) before introducing
  component-level percent math. Reviewers will expect changes in `stat`
  formatters or `utils/stats/format.ts`, not ad-hoc patches.

## 5. Working With Logs

- `logEffects` in
  [`effects/factory.ts`](../packages/web/src/translation/effects/factory.ts)
  mirrors `summarizeEffects`/`describeEffects` but produces flattened entries
  suitable for the action log. Always extend existing effect formatters with a
  `log` handler when new actions need specific log phrasing.
- `diffStepSnapshots` and `resolvePassivePresentation` under `translation/log`
  combine the canonical passive icons and removal reasons—refer to
  [`log/passives.ts`](../packages/web/src/translation/log/passives.ts) and
  [`log/diffSections.ts`](../packages/web/src/translation/log/diffSections.ts)
  before formatting manual passive changes.

## 6. Checklist Before Adding Text

1. Identify which content translator or effect formatter already covers your
   mechanic. Prefer extending it over creating parallel wording.
2. Choose the correct mode (`summarize`, `describe`, `log`) for the UI surface.
3. Use the helper utilities above for verbs, icons, costs, passives, and skip
   descriptions.
4. Mark long-form narrative text with `_desc` so `splitSummary` can route it to
   the description panel.
