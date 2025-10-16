# Contents Configuration Guide

The builder helpers in `packages/contents/src/config/builders.ts` are designed so
non-programmers can compose valid game data with descriptive, chainable calls.
This guide highlights the most common gotchas and shows how the new validation
messages point you to the fix.

## Core patterns

- **Every action, building, development and population needs an id and a name.**

  ```ts
  import { action } from './config/builders';

  const expand = action().id('expand').name('Expand').icon('🪙');
  ```

- **Pick exactly one quantity helper for resource or stat changes.** Use
  `.amount(x)` for flat adjustments or `.percent(x)` / `.percentFromStat(stat)`
  for scaling rules.

  ```ts
  import {
  	effect,
  	resourceParams,
  	Types,
  	ResourceMethods,
  } from './config/builders';
  import { Resource } from './resources';

  const gainGold = effect(Types.Resource, ResourceMethods.ADD)
  	.params(resourceParams().key(Resource.gold).amount(2))
  	.build();
  ```

- **Passives, developments, population effects and attacks all need a target id
  of some sort.** The builders now stop early if you forget.

## Friendly error messages

When something is missing or duplicated, the builder throws a plain-language
message explaining what to change. A few examples:

| Situation                                                              | Message                                                                                                                  | Suggested fix                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Forgot to call `.id()` on an action                                    | `Action is missing id(). Call id('unique-id') before build().`                                                           | Add `.id('my_action')` once.                                                  |
| Tried calling `.amount()` and `.percent()` on the same resource effect | `Resource change cannot use both amount() and percent(). Choose one of them.`                                            | Remove one of the calls and keep the approach you want.                       |
| Built an effect wrapper without any nested effects or type             | `Effect is missing type() and method(). Call effect(Types.X, Methods.Y) or add nested effect(...) calls before build().` | Either supply a type/method or add a nested effect before calling `.build()`. |

## Checklist before calling `.build()`

- [ ] Did I call `.id()` and `.name()` exactly once?
- [ ] For resource/stat tweaks, did I choose **one** of `.amount()`, `.percent()`
      or `.percentFromStat()`?
- [ ] Does every passive/development/population/attack reference include the id
      or role it needs?
- [ ] If I used `effect()`, does it either specify a type/method or contain at
      least one nested `.effect(...)`?

Following this checklist keeps the content registry clean and prevents confusing
runtime failures. The tests in `packages/contents/tests/builder-validations.test.ts`
cover the most common mistakes so new messages stay informative.

## Happiness thresholds

The happiness tier builder lives in `packages/contents/src/rules.ts`. When
adding or updating tiers:

- Declare each tier with `happinessTier()` and provide an inclusive `range`, the
  passive payload, and any supporting metadata.
- Use the helper modifiers to keep effects consistent:
  - `incomeModifier(...)` adjusts gold gain.
  - `buildingDiscountModifier(...)` lowers building costs.
  - `growthBonusEffect(...)` grants Growth stat bonuses.
- Register phase or upkeep skips through `.skipPhase(...)` / `.skipStep(...)`
  so the engine can disable the appropriate cycle hooks without ad-hoc logic.
- Metadata helpers such as `.growthBonusPct(...)`, `.disableGrowth()`, and
  `.text(...)` drive UI copy. Keep removal text aligned with the range shown to
  players.

After changing ranges or metadata, update
`tests/integration/happiness-tier-content.test.ts` so the snapshot reflects the
new configuration.
