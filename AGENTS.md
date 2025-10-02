# AGENTS.md – Global Guidelines (Top-level Scope)

## 🚫 Prohibited Hardcoding

- **Engine and Web layers must never hardcode game data.**
  - Do **not** reference specific resource/stat keys, starting values, or effect behaviors directly in engine or web code.
  - Example of prohibited code: `if (resource === "gold") ...` or `const startingHealth = 100;`.
  - Game data may change independently in `packages/contents`. The Engine and Web should remain agnostic to such specifics.

- **All game content belongs exclusively in `packages/contents`.**
  - If your code needs to know about a resource, stat, or effect, fetch it from the content domain or a registry designed for dynamic lookup.
  - Do not replicate or copy content definitions into engine/web modules.

## 🧪 Testing

- **Tests may not rely on literals or hard-coded IDs.**
  - Never bake in expected names or numeric values (e.g., “expect gold to be 10”).
  - Obtain action, building, and development ids from content definitions or factories.
  - Instead, retrieve those values via content modules or mock registries at runtime.
  - Rationale: Content changes (e.g., different starting gold or altered action effects) shouldn’t break tests unless the engine itself lacks support for such changes.

- **Use the synthetic content factory** to generate minimal actions, buildings, and other entities during tests.  
  Call `createContentFactory()` and build definitions inside the test to keep ids dynamic.

- **Property-based testing** with [`fast-check`](https://github.com/dubzzz/fast-check) is encouraged for engine invariants.  
  Randomized costs or gains can reveal edge cases that example-based tests miss.

### 🔧 Dynamic examples

```ts
const content = createContentFactory();
const effect = {
	type: 'resource',
	method: 'add',
	params: { key: CResource.gold, amount: 2 },
};
const action = content.action({ effects: [effect] });
const ctx = createTestEngine(content);
const before = ctx.activePlayer.gold;
performAction(action.id, ctx);
expect(ctx.activePlayer.gold).toBe(before + effect.params.amount);
```

```ts
fc.assert(
	fc.property(resourceMapArb, (costs) => {
		const content = createContentFactory();
		const action = content.action({ baseCosts: costs });
		// ...assert invariants
	}),
);
```

## ✅ Compliance Checklist for Engine/Web Code

- [ ] No references to specific resource/stat keys or effect behaviors.
- [ ] All data lookups go through content or registry APIs.
- [ ] Tests fetch expected values dynamically from content or mock registries.
- [ ] New features are reviewed for adherence to content-driven design.

## 🧩 Uniform Solutions

- When adjusting UI text, icons, or formatting conventions, prefer a single
  uniform solution that can be reused everywhere that pattern appears. Update
  helper utilities or shared formatters rather than patching isolated strings.
- If a divergence from an established uniform solution is unavoidable, call it
  out explicitly in your PR description so reviewers understand the rationale.

## 🔁 Enforcement

- Pull requests touching engine, web, or tests will be reviewed for compliance with these rules.
- Violations (e.g., hardcoding resource names or relying on fixed numeric values in tests) will require refactoring before merge.

## ☑️ Summary

- The Engine and Web stay content-agnostic.
- Tests dynamically fetch expectations from content or registries.
- This ensures game data can evolve independently without breaking engine/web code or tests.

# Agent discovery log

- 2025-08-31: Run tests with `npm run test:quick >/tmp/unit.log 2>&1 && tail -n 100 /tmp/unit.log`; avoid running extra test commands unless specifically asked.
- 2025-08-31: `git commit` triggers a Husky pre-commit hook running lint-staged and the fast Vitest suite.
- 2025-08-31: Use `rg` for code searches; `grep -R` and `ls -R` are discouraged for performance.
- 2025-08-31: Registries can validate entries with Zod schemas; invalid data will throw during `add`.
- 2025-08-31: A quick Node script can scan content files to detect duplicate icons across actions, buildings, stats, population roles and developments.
- 2025-08-31: `npm run dev` prebuilds `@kingdom-builder/contents` via a `predev` script to avoid missing dist files.
- 2025-09-24: That prebuild currently fails in this environment (the contents TypeScript project rejects engine sources outside
  its `rootDir`). To launch Vite for screenshots, run it from the web workspace instead:
  `npm run --workspace @kingdom-builder/web dev -- --host 0.0.0.0 --port 4173`.
- 2025-08-31: Player snapshots now require the engine context to include active passive IDs; use `snapshotPlayer(player, ctx)`.
- 2025-08-31: `handleEndTurn` will not advance phases if a player has remaining AP; automated tests must spend or clear AP first.
- 2025-08-31: Log entries include `playerId` so the web UI can style messages per player.
- 2025-08-31: Player log text can reuse inactive player panel hues; dark mode should invert to lighter shades for readability.
- 2025-08-31: To render full action cards for unlock effects, the `action:add` formatter should return the unlock text followed by `describeContent('action', id, ctx)`.
- 2025-08-31: Summary entries with a `_hoist` flag are lifted outside installation wrappers.
- 2025-08-31: Exporting TS interfaces from React modules can trigger Vite Fast Refresh incompatibility; use type-only exports instead.
- 2025-08-31: Use `rg --hidden` to search hidden directories like `.github`.
- 2025-08-31: Use `SLOT_ICON` from `@kingdom-builder/contents` for development slot requirement indicators.
- 2025-08-31: Trigger handling now uses `collectTriggerEffects`; direct
  `runTrigger` helper has been removed. Switch the active player index when
  resolving triggers for non-active players.
- 2025-08-31: `npm run test:coverage` (also used by `npm run test:ci`) requires `@vitest/coverage-v8`; install with `npm install --no-save @vitest/coverage-v8` if missing.
- 2025-08-31: `performAction` returns sub-action traces via `ctx.actionTraces` for nested log attribution.
- 2025-08-31: Use `buildInfo(registry, { id: icon })` to derive icon/label maps from content registries.
- 2025-08-31: Compose effects with `effect(type, method).param(key, value)` to avoid manual `{ type, method, params }` objects.
- 2025-08-31: Content builders now chain `.id().name().icon()` and icons live on config entries; standalone info maps are deprecated.
- 2025-08-31: Overview screen can pull icons from contents (e.g. ACTION_INFO, LAND_ICON) to keep keywords visually consistent.
- 2025-10-03: `npm run lint` and all test commands auto-install missing dev deps (`eslint-plugin-import`, `@vitest/coverage-v8`). Network access is required the first time they run in a fresh workspace.
- 2025-08-31: PlayerState maintains `statsHistory` so stats returning to zero remain visible; initialize new non-zero stats accordingly.
- 2025-08-31: Restore a file from the previous commit with `git checkout HEAD^ -- path/to/file`.
- 2025-09-01: `stat:add_pct` effects honor a `round` setting like resources; use `round: 'up'` to keep strength stats integer and non-negative.
- 2025-09-02: Scope result modifiers by tagging evaluators with an `id` (e.g. population id 'tax') and referencing it in the modifier's `evaluation`.
- 2025-09-03: Use `diffStepSnapshots` instead of `diffSnapshots` when logging action results to capture resource source icons.
- 2025-09-14: PlayerState auto-initializes stats by iterating over `Stat` keys; adding a new stat requires only updating the `Stat` map and providing getters/setters.
- 2025-09-20: Frontend should serialize engine calls with a promise queue to prevent race conditions when dev mode advances phases rapidly.
- 2025-09-21: EngineContext exposes a built-in `enqueue` method; use `ctx.enqueue` to serialize engine operations.
- 2025-09-22: `setLog` functional updates read `ctx.activePlayer` at render time; capture the player before `setLog` to avoid misattributed log entries.
- 2025-09-15: Requirement handlers return `true` or a message; `getActionRequirements` collects these messages for UI prompts.
- 2025-09-16: Use `evaluator:compare` requirement to compare numeric evaluator outputs without custom handlers.
- 2025-09-17: Derive requirement icons in the UI by parsing evaluator comparisons; see `getRequirementIcons` utility.
- 2025-09-18: `result_mod` accepts an `adjust` parameter to tweak evaluation gains like `transfer_pct`.
- 2025-09-20: Resource transfers use evaluation key `transfer_pct:percent` for modifier targeting.
- 2025-09-22: Clamp percentage-based resource transfers to available balance to avoid negative totals when modifiers exceed 100%.
- 2025-10-01: Shell starts without standard binaries in PATH; run `export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` to restore.
- 2025-10-05: `compare` evaluator returns 1 when a comparison holds, allowing conditional effects.
- 2025-08-31: Node and npm may be missing; install with `apt-get install -y nodejs npm` before running tests.
- 2025-10-10: `action:perform` handler automatically snapshots for action traces, so nested manual snapshotting is redundant.
- 2025-10-11: Building stat bonuses should use `PassiveMethods.ADD` with a unique id to tie their effects to the building's existence.
- 2025-10-19: Population labels are defined in `packages/contents/src/populationRoles.ts` for UI display.
- 2025-10-28: Dynamic PlayerState properties required disabling `noPropertyAccessFromIndexSignature` in `tsconfig.base.json`.
- 2025-10-28: Missing `eslint-plugin-import` causes eslint to fail; install with `npm install --no-save eslint-plugin-import`.
- 2025-10-28: Engine `Resource` and `Stat` constants are empty until `setResourceKeys`/`setStatKeys` run; use content-side keys when configuring tests before engine creation.
- 2025-08-31: `attack:perform` effect parameters `ignoreAbsorption`, `ignoreFortification` and nested `onDamage` effects require dedicated web formatter for player-facing text.
- 2025-08-31: Merge attacker and defender on-damage summaries by tagging items "for you" or "for opponent" instead of separate groups.
- 2025-08-31: Compact on-damage summaries further by prefixing entries with "You" or "Opponent".
- 2025-08-31: Suffix on-damage summary items with "for you"/"for opponent" to keep icons leading each line.
- 2025-10-23: Summary entries with a `_desc` flag appear under the Description section.
- 2025-10-29: Phase icons live in `PHASES`; grab them with `PHASES.find(p => p.id === id)?.icon` for overview displays.
- 2025-10-30: `@formkit/auto-animate` can add smooth transitions to UI lists and values via `useAutoAnimate`.
- 2025-08-31: Web effect formatters should import `Resource` and `Stat` from `@kingdom-builder/contents` to avoid undefined index errors when accessing `RESOURCES` and `STATS`.
- 2025-08-31: Configure runtime phase and population role enums with `setPhaseKeys` and `setPopulationRoleKeys` before creating the engine.
- 2025-08-31: Type re-exports from React modules can still break Vite Fast Refresh; move shared types to separate files.
- 2025-08-31: Engine creation now requires passing a `rules` object; import `RULES` from `@kingdom-builder/contents` when initializing tests or the web context.
- 2025-08-31: Determine the default action cost resource by intersecting cost keys of non-system actions; expose it as `actionCostResource` in `GameContext` for UI use.
- 2025-08-31: Stat add formatting can be driven by `addFormat` in `STATS` to supply prefixes or percentage displays.
- 2025-08-31: Percentage-based stats can be detected from their `addFormat.percent` (or `displayAsPercent`) flag instead of hardcoding keys.

# Core Agent principles

We are gradually, step by step, implementing a digital game. You can refer to the README.md for a summary of the game's general format and objective. The goal of Agents working on this project is to help structure the repository in such a way that we make progress towards our end-goal: A fully functional, robust, elegant and _extensible_ game. This is _not_ a type of game where we hardcode most things, stick to one config, and the game is done and forgotten. This game must be heavily configurable, possibly later by players themselves through a game config editor, but initially by ourselves for heavy AB & game design testing. We must be able to change nearly anything at a whim - Change configs, add buildings, add actions, invent new effects, invent new ratio's and thresholds for things, and so on.

Therefore, the main mission for agents is to understand the intended game, and it's mechanics/terminology, very well. This is necessary in order to build a proper abstract, extensible system that allows us to make changes to the game's configuration by just changing some simple configs (rather than needing to update tens of if-statements everywhere). Therefore, in this project, we focus on very correct architecture, structure, separation, and a correct implementation of principles such as OOP, SOLID, DRY, YAGNI, KISS, and so on. When in doubt, over-engineering is the answer, because later I will invent a new Building and I will want to configure it myself with some unique combination of costs/requirements/effects and it should 'just work' as it is being carried by systems that understand such concepts.

Full game information can be read below.

# Default content

Engine logic is decoupled from game data. The default configuration lives in
`packages/contents`; supply those registries to `createEngine` or provide your
own to experiment with new actions, buildings and more.

# Reference documents

- [CONTRIBUTING](CONTRIBUTING/AGENTS.md)
- [ARCHITECTURE](docs/architecture/AGENTS.md)
- [CODE_STANDARDS](docs/code_standards/AGENTS.md)
- [FRONTEND_TRANSLATION](docs/frontend_translation/AGENTS.md)

# Abstraction guidelines

- Model behaviour through formal **Triggers** and **Effects**. Avoid hard coded fields such as `apOnUpkeep`; instead, wire rules through the central effect system so that any trigger can resolve any effect.
- When writing tests, derive expectations from the active configuration or from a mocked registry. Do not hard code numeric values like `toBe(10)` when the value comes from config; fetch it from the registry so tests continue to pass if configs change.
- Prefer composing behaviour via registries that can be overridden in tests. This keeps the engine flexible and showcases how new content can be added without touching core code.
- Use **Evaluators** to orchestrate conditional or iterative logic. Effects may include an `evaluator` and nested `effects`; the evaluator resolves to a value controlling how many times the sub-effects run. For example, `{ evaluator: { type: "development", params: { id: "farm" } }, effects: [{ type: "resource", method: "add", params: { key: "gold", amount: 2 } }] }` applies the resource gain per matching development.
- Define leaf effects with `type` and `method` keys to separate domains (Resource, Stat, Land, etc.) from operations (add, remove, till...). This keeps params well-typed and enables a uniform effect registry.

# Testing guidelines

Tests live in:

- `packages/engine/tests` for unit tests
- `tests/integration` for integration tests

To run the fast test suite and capture a reliable summary without redundant
checks, execute:

```sh
npm run test:quick >/tmp/unit.log 2>&1 && tail -n 100 /tmp/unit.log
```

This command runs Vitest without coverage and saves the output to
`/tmp/unit.log`. The `tail` command prints the final portion of the log so
you can quickly confirm whether tests passed or inspect any failures.

**Run no additional manual tests.** Execute only the command above,
verify the tail output looks correct, and proceed without running any
extra test or build commands.

The pre-commit hook already runs `lint-staged` and `npm run test:quick`
(which triggers the `pretest` dependency install step). Running the test
command again manually would repeat those checks. GitHub Actions executes
`npm run test:ci` (coverage) and `npm run build` for each pull request. Run
these scripts locally only when debugging or when changes could affect
them. See
[CONTRIBUTING](CONTRIBUTING/AGENTS.md) for details.

# Game overview

The game consists of two players, player A and B. Player A always goes first. Player B gains additional resources/stats in their first turn to compensate. Concrete compensation resources/stats defined in `contents/src/game.ts`.

# Game phasing

The game is played in turns. Each turn has three phases; Growth Phase, Upkeep Phase, Main Phase. Players take turns going through the phases. First Player A goes through Growth phase, then Player B goes through Growth Phase, then Player A through Upkeep Phase, then player B through Upkeep Phase. If a decision needs to be made by a player in one of these phases, the game halts until the decision has been made. Finally, Player A and B simultaneously go through Main Phase, which is where they can pick their action(s) for their turn. Both players choose their actions, during the Main Phase, simultaneously. They do so in secret. The action(s) are locked in the moment both players have committed their action(s). Then, the Actions play out for Player A first, in the order Player A chose. Then, the actions for Player B play out, in the order player B chose.

# Core mechanic definitions

- Actions can have Cost(s), Requirement(s) and Effect(s). An Action always has at least one Effect. However, an Action does not necessarily require a Cost or a Requirement to function.
- Costs, Requirements and Effects each hook into the same core systems we call Resources, Land, Buildings, Developments and Stats.
- A Resource is something tangible that behaves like a currency, they fluxuate up and down and can be obtained and consumed. Examples are Gold, Action Points, Happiness and Castle HP.
- A Building is a construction that provides one or more passive bonuses (Effect(s) throughout the game.
- Land is real estate surrounding the Castle that Developments can be placed on. A Land tile starts out with one Development Slot. More Development Slots can be unlocked per Land tile later through certain Effects (typically incurred by Actions).
- A Development Slot is a spot where Developments can be made on. A Development Slot is always tied to a particular Land tile.
- A Development takes place on a Development Slot, on a particular Land tile. Developments have an Effect when installed, either one-time or persistent.
- Stats are different from Resources in the sense that they indicate a stat of something, and are not necessarily tangible resources. For example, Max Population is a stat. Current Population is also a stat. This stat is tracked by adding the number of Houses (a type of Development), adding +1 for the Castle, and adding any active Buildings which have a House slot inside them.

# Core mechanic definitions, part 2

Back to Actions - An Action can have three things: Zero or more Costs, zero or more Requirements and one or more effects.

- A Cost can be any Resource. So Gold, AP, Happiness and Castle HP. The configured amount of that Resource is then consumed when the Action is played.
- A Requirement can be anything - A Resource, a Stat, a Building, etc. For example, some Actions may only be played when the player has at least one Population Slot remaining (Max Pop > Cur Pop).
- An Effect can also be nearly anything. It can increase or consume a resource once. It can also increase or consume a resource periodically on some trigger (for example, 'at start of upkeep', or 'every time you gain happiness', or 'every time you are attacked'). An Effect can also trigger an Action, in which case the Cost of that Action is foregone, as the Cost of an Action is only incurred when a player manually performs the Action, not when the Action is performed as part of some triggered Effect.

# Effects, deeper

We have Trigger Effects and Global Effects. The former was explained in section above. The latter however, Global Effects, are ongoing at any given time, and usually hook into other Effects. One such Effect could be "All Gold gain increased by 25%", which should trigger every time a "gold gain" effect is triggered, and modify it's amount.

# Population

Finally, we have Population, which is made up of four archtypes: Council, Legion, Fortifier and Citizen. Certain Actions can create Population, or change the Archtype of a Population member. Each Population member has one or more Effects, again with specific triggers or global. For example, the Council generates one AP at the end of every Growth Phase (trigger effect). The Legion passively provides 1 Army Strength (a stat) (global effect, active at all times). When the Legion is relieved from its position, this global effect is removed. The Legion also permanently grows the current Army Strength by 25% of its current size, at every Growth Phase (trigger effect, permanent stat change). Even if the Legion is removed afterwards, this stat change stays - it was a one-time stat increase, not one tingent on its continued existence.

# Start of game setup

The game starts with each player having:

- Castle, with 10 Health.
- Max Population Stat = 1
- Two Land tiles. One empty (one open Development Slot). One whose Development Slot is filled by Development "Farm". Farm has a single Effect, based on a trigger. On every Growth Phase: Gain 2 Gold.
- One Population with Archtype Council
- Ten Gold
- Zero Happiness
- Zero Army Strength
- Zero Fortification Strength

## Game Systems in the Engine

| System                        | Definition in the Engine                                                                                                                                                                                                                                             | Typical Use & Behavior                                                                                                        | Contrast vs. Related Systems                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resources**                 | Arbitrary numeric pools keyed by string. Stored in each player’s `resources` map and exposed as properties. Modified by effects like `resource:add`, `resource:remove`, or `resource:transfer` (which can involve rounding rules and passive modifiers)              | Represent consumable currencies (e.g., gold, AP, happiness). Spent via costs and regenerated by effects or phase triggers.    | Unlike **Stats**, resources are typically paid or gained outright and may go negative only when explicitly allowed.                                           |
| **Stats**                     | Numeric attributes stored in `stats` with a parallel `statsHistory` to track whether a stat has ever been non-zero. Modified through effects such as `stat:add`, `stat:remove`, or `stat:add_pct` (which caches base values per step for additive scaling)           | Measure long-term capabilities (army strength, fortification, absorption, etc.) and often drive comparisons or scaling.       | Unlike **Resources**, stats are rarely “paid”; they represent abilities or limits rather than currency.                                                       |
| **Population**                | Counts of individuals per role in a `population` map. Role IDs are configurable and each role can trigger `onAssigned`/`onUnassigned`/phase effects. Added or removed via `population:add`/`population:remove` which also fire role effects and passives             | Models workers/units such as Council or Legion. Used for income, strength bonuses, or other triggered effects.                | Unlike **Stats**, population is discrete and can’t be modified fractionally. It is capped by rules (pop cap) rather than history.                             |
| **Buildings**                 | Global structures recorded in a player’s `buildings` set. Configurations include costs and trigger lists (`onBuild`, `onGrowthPhase`, etc.). Built via `building:add`, removed via `building:remove` which may add or remove passives                                | Provide persistent bonuses, cost or result modifiers, or triggered effects. Often grant actions or passives on construction.  | Unlike **Developments**, buildings are not tied to land slots.                                                                                                |
| **Developments**              | Improvements tied to a specific `Land`. Each land holds a list of development IDs and a `slotsMax/slotsUsed` cap. Added/removed by `development:add`/`development:remove`; may register passives and can raise stats or population caps                              | Used to upgrade territory, often producing localized benefits (e.g., farms, houses).                                          | Unlike **Buildings**, developments consume land slots and are land-specific; unlike **Resources/Stats**, they are discrete objects rather than numeric pools. |
| **Lands & Development Slots** | `Land` objects hold `slotsMax`, `slotsUsed`, `tilled` state, and a list of development IDs. New land is created via `land:add`; slots can be increased by tilling (`land:till`) up to a rules-defined max                                                            | Lands limit how many developments can be built; expanding land or tilling provides more capacity.                             | Slots resemble a discrete capacity system, whereas **Stats** like `maxPopulation` represent global numeric limits.                                            |
| **Actions**                   | Player-initiated sequences defined with id, name, base costs, requirements, and effect lists. Performing an action evaluates requirements, computes costs, pays them, executes effects, then applies result modifiers and logs traces                                | Represents explicit player choices (e.g., “expand,” “raise_pop”). Actions can be gated behind system locking and passives.    | Differ from **Effects** in that actions wrap many effects, include cost/requirement handling, and produce logs.                                               |
| **Effects**                   | Atomic operations identified by `type` & `method` with optional params, nested `effects`, or evaluators. Managed through an `EffectRegistry`, executed via `runEffects`. Used in actions, passives, triggers, or requirements                                        | Implement state mutations: resource changes, stat adjustments, population shifts, attack resolution, passive management, etc. | Unlike **Actions**, effects have no inherent cost or requirement logic; they are building blocks used everywhere.                                             |
| **Triggers**                  | Named events in the game flow (e.g., `onGrowthPhase`, `onBeforeAttacked`). When a trigger fires, `collectTriggerEffects` gathers matching effect lists from population roles, developments, buildings, and passives and runs them automatically                      | Drive automatic or phase-based effects like upkeep income or attack reactions.                                                | Unlike **Actions**, triggers require no player input or costs; unlike **Passives**, they are momentary event hooks rather than persistent bundles.            |
| **Requirements**              | Conditions checked before performing actions. Each requirement uses a handler (e.g., evaluator comparison) and returns `true` or an error message. Defined with type, method, params, and optional message                                                           | Ensure prerequisites such as “population less than max” are met.                                                              | Requirements are purely checks; they do not consume resources or change state, unlike effects or costs.                                                       |
| **Costs**                     | Resource expenditures required to execute an action. Built from base action costs plus additional costs gathered from effect collectors, then adjusted by cost modifiers before payment. Payment reduces resources if the player can afford it                       | Limit the frequency of actions by consuming resources or AP.                                                                  | Costs differ from **Requirements** (which are checks) and **Modifiers** (which alter costs or results).                                                       |
| **Modifiers**                 | Functions that modify costs, action results, or evaluation outcomes. Registered with the `PassiveManager` as cost, result, or evaluation modifiers. Triggered at cost computation, after action resolution, or during evaluator calculations                         | Used for dynamic adjustments (e.g., discounts, bonus resource gains, altered attack power).                                   | Modifiers are inert until registered via a **Passive**; passives manage the lifecycle of these modifiers.                                                     |
| **Passives**                  | Persistent bundles of effects and optional trigger lists, stored in `PassiveManager`. Adding a passive immediately runs its setup effects and registers any cost, result, or evaluation modifiers; removing it runs teardown effects and unregisters those modifiers | Represent ongoing buffs, debuffs, or conditional triggers granted by buildings, population roles, or other systems.           | Passives differ from **Effects** (one-shot) and from static **Buildings/Developments** (which may grant passives but don’t manage modifier lifecycles).       |
| **Modifiers vs. Passives**    | Modifiers are the functional hooks that actually adjust cost/result/evaluation; passives are containers that register and unregister those modifiers and may run other effects.                                                                                      | Passives enable toggling or stacking modifiers and tie them to ownership or triggers.                                         | Modifiers alone have no persistence; passives provide the stateful context.                                                                                   |

### Usage Insights

- Choose **Resources** when modeling consumable currencies or hit points that can be spent or transferred.
- Use **Stats** for long-term attributes, capacities, or percentages that influence gameplay but aren’t directly paid as costs.
- Use **Population** to represent discrete units with role-based behaviors or triggers.
- Build **Buildings** for global, player-wide structures; develop **Developments** when improvements must occupy land slots and potentially alter population capacity or local stats.
- Create **Actions** for player-driven operations requiring costs and requirement checks; compose them from **Effects** for the actual state changes.
- Employ **Requirements** to gate actions without altering state; apply **Costs** to consume resources.
- Leverage **Passives** (and their associated **Modifiers**) for continuous or conditional adjustments to costs, results, or evaluator calculations.
