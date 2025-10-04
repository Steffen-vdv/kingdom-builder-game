# Happiness Threshold System

This document summarises the fully implemented happiness threshold system and
how to maintain or extend it across the content, engine and web packages.

## Content configuration (`packages/contents/src/rules.ts`)

- Thresholds are declared with the `happinessTier()` builder. Each tier specifies
  an inclusive `range`, passive payload and optional metadata.
- Passives must describe all live modifiers:
  - Use `incomeModifier(...)` helpers for gold gain adjustments.
  - Apply `buildingDiscountModifier(...)` for building cost changes.
  - Add `growthBonusEffect(...)` entries when a tier adjusts the Growth stat.
  - Register phase/step skips with `.skipPhase(...)`/`.skipStep(...)` so the
    engine can disable Growth or individual upkeep steps.
- Metadata such as `.growthBonusPct(...)`, `.disableGrowth()` and descriptive
  `.text(...)` blocks drives UI copy and hover tooltips. Keep the removal text in
  sync with the inclusive range shown to players.
- When altering ranges or effects, update the integration snapshot in
  `tests/integration/happiness-tier-content.test.ts` to reflect the new passive
  metadata and skip markers.

## Engine behaviour

- `Services.handleTieredResourceChange` swaps the active tier passive whenever a
  player's happiness crosses a threshold. Skip markers and metadata are applied
  as part of the passive registration.
- Registered passives automatically add/remove their effects, so any stat
  changes (e.g. Growth +20%) are reversed when the player leaves the tier.
- Growth phase and upkeep skips are honoured by the advance flow—ensure any new
  tiers use `.skipPhase`/`.skipStep` rather than ad-hoc engine checks.

## Web presentation

- The passive list and happiness hover card read metadata from the engine. Keep
  summary/removal copy short and consistent so UI elements stay aligned.
- When adding new tiers, verify that the hover card highlights the active tier
  and that passive tooltips surface the correct removal condition.

## QA checklist

1. Run `npm run test:quick` after changing tier data to cover engine, content
   and web integrations.
2. Manually spot-check a game session (development build) to confirm growth
   skips, war recovery suppression and building discounts display correctly.
3. Update the integration snapshot whenever metadata strings or ranges change.

Following this workflow keeps the happiness thresholds content-driven while
ensuring engine flow control and UI messaging stay in sync.
