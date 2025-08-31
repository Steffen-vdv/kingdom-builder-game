# Knowledge sharing

## Maintain a discovery log

To streamline collaboration, the repository owner asks every agent to keep
track of any non-obvious discoveries made while completing their task. These
may include repository structure tips, tricky commands, or environment quirks
that required some investigation. Maintain this list during your work and, when
submitting a pull request, append your findings to the **Agent discovery log**
below.
Avoid logging the routine steps you performed, avoid logging updates related to your implementation; use the discovery log only for
non-obvious insights that will help future agents work more efficiently. Any updates or documentation related to your implementation should be plaecd in architectural/system design/system config documentation elsewhere.

## Agent discovery log

- 2025-08-31: Run tests with `npm run test:coverage >/tmp/unit.log 2>&1 && tail -n 100 /tmp/unit.log`; avoid running extra test commands.
- 2025-08-31: `git commit` triggers a Husky pre-commit hook running lint-staged, type checking, linting and tests.
- 2025-08-31: Use `rg` for code searches; `grep -R` and `ls -R` are discouraged for performance.
- 2025-08-31: Registries can validate entries with Zod schemas; invalid data will throw during `add`.
- 2025-08-31: A quick Node script can scan content files to detect duplicate icons across actions, buildings, stats, population roles and developments.
- 2025-08-31: Buildings that unlock actions require an `action` effect formatter so they aren't marked as unimplemented in the UI.
- 2025-08-31: `summarizeContent` and `describeContent` for actions can accept params; `applyParamsToEffects` resolves placeholders for dynamic summaries.
- 2025-08-31: `npm run dev` prebuilds `@kingdom-builder/contents` via a `predev` script to avoid missing dist files.

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

To run the test suite and capture a reliable summary without redundant
checks, execute:

```sh
npm run test:coverage >/tmp/unit.log 2>&1 && tail -n 100 /tmp/unit.log
```

This command runs the tests with coverage and saves the output to
`/tmp/unit.log`. The `tail` command prints the final portion of the log so
you can quickly confirm whether tests passed or inspect any failures.

**Run no additional manual tests.** Execute only the command above,
verify the tail output looks correct, and proceed without running any
extra test or build commands.

The pre-commit hook already runs `lint-staged`, type checking, linting, and
`npm test` (which triggers a `pretest` step). Running `npm test` manually
would repeat those checks. GitHub Actions executes `npm run test:coverage`
and `npm run build` for each pull request. Run these scripts locally only
when debugging or when changes could affect them. See
[CONTRIBUTING](CONTRIBUTING/AGENTS.md) for details.

# Game overview

The game consists of two players, player A and B. Player A always goes first. Player B gains an additional Action Point (AP) in their first turn to compensate.

# Game phasing

The game is played in turns. Each turn has three phases; Development Phase, Upkeep Phase, Main Phase. Players take turns going through the phases. First Player A goes through Development phase, then Player B goes through Development Phase, then Player A through Upkeep Phase, then player B through Upkeep Phase. If a decision needs to be made by a player in one of these phases, the game halts until the decision has been made. Finally, Player A and B simultaneously go through Main Phase, which is where they can pick their action(s) for their turn. Both players choose their actions, during the Main Phase, simultaneously. They do so in secret. The action(s) are locked in the moment both players have committed their action(s). Then, the Actions play out for Player A first, in the order Player A chose. Then, the actions for Player B play out, in the order player B chose.

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

Finally, we have Population, which is made up of four archtypes: Council, Army Commander, Fortifier and Citizen. Certain Actions can create Population, or change the Archtype of a Population member. Each Population member has one or more Effects, again with specific triggers or global. For example, the Council generates one AP at the end of every Development Phase (trigger effect). The Army Commander passively provides 1 Army Strength (a stat) (global effect, active at all times). When the Army Commander is relieved from his position, this global effect is removed. The Army Commander also permanently grows the current Army Strength by 25% of it's current size, at every Development Phase (trigger effect, permanent stat change). Even if the Army Commander is removed afterwards, this stat change stays - it was a one-time stat increase, not one tingent on his continued existence.

# Start of game setup

The game starts with each player having:

- Castle, with 10 Health.
- Max Population Stat = 1
- Two Land tiles. One empty (one open Development Slot). One whose Development Slot is filled by Development "Farm". Farm has a single Effect, based on a trigger. On every Development Phase: Gain 2 Gold.
- One Population with Archtype Council
- Ten Gold
- Zero Happiness
- Zero Army Strength
- Zero Fortification Strength
