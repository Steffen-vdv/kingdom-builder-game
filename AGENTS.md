# AGENTS.md – Repository Operations & Game Reference

## Quick Start Summary

- Start with [`docs/agent-quick-start.md`](docs/agent-quick-start.md) for the
  mandatory workflow, coding rules, and PR process.
- For player-facing copy, complete Section 0 ("Before Writing Text") in
  [`docs/text-formatting.md`](docs/text-formatting.md#0-before-writing-text) and
  paste its quick-reference checklist into your PR body.
- Always load game data from content packages or registries and create synthetic
  fixtures through `createContentFactory()` in tests.
- Run `npm run lint`, `npm run format`, and `npm run check` before submitting a
  PR, and copy `.github/PULL_REQUEST_TEMPLATE.md` verbatim into the PR body
  before calling `make_pr`.

▶ **Extended guidance, architecture lore, and gameplay reference begin in
Section&nbsp;1 below.**

---

## 1. Core Agent Principles

- We are incrementally delivering a fully functional, robust, elegant, and
  **extensible** digital game. Architecture, separation of concerns, and data-
  driven systems take priority over quick hacks.
- Expect the Content domain to change frequently. Engine, Web, and tests must
  continue to work when new buildings, actions, effects, or ratios are
  introduced.
- Embrace over-engineering where it enables configuration-driven features.
  Players (or live-ops) should be able to invent new mechanics by editing
  content definitions without touching engine code.
- Apply proven design principles (SOLID, DRY, YAGNI, KISS) and model behaviour
  through **Triggers**, **Effects**, **Evaluators**, registries, and passives
  rather than special cases.
- Uniform UI solutions matter. When adjusting text, icons, or formatting,
  prefer reusable helpers or shared utilities. Any unavoidable divergence should
  be highlighted in the PR description.

### 1.1 Global Content Policy

- **Never hardcode game data in the Engine or Web layers.** Resource/stat keys,
  starting values, effect behaviour, names, and icons must be sourced from
  `@kingdom-builder/contents` (or a provided registry) at runtime.
- **Tests must not rely on literals or hard-coded IDs.** Fetch ids, names, and
  numeric values from content definitions, registries, mocks, or synthetic
  factories.
- **Use the synthetic content factory in tests.** Call `createContentFactory()`
  to generate dynamic actions, buildings, developments, population roles, etc.
- **Property-based testing** with [`fast-check`](https://github.com/dubzzz/fast-check)
  is encouraged to explore randomized inputs and engine invariants.
- Compliance checklist for Engine/Web contributions:
  - [ ] No references to specific resource/stat keys or effect behaviours.
  - [ ] All lookups go through content or registry APIs.
  - [ ] Tests obtain expectations dynamically from content or mock registries.
  - [ ] New features keep the system content-driven.

### 1.2 Enforcement & Review Expectations

- Pull requests touching engine, web, or tests are reviewed for adherence to the
  data-driven rules above.
- Violations (e.g., hardcoding resource names or relying on fixed numeric
  values) must be refactored before merge.
- Reviewers must bounce any PR where the text-formatting checklist answers in
  the template are left blank or incomplete.

---

## 2. Development Workflow

### 2.1 Environment & Setup

1. Install [Node.js 18+](https://nodejs.org/). Node and npm may be missing in a
   fresh environment; install with `apt-get install -y nodejs npm` if required.
2. Install dependencies via `npm install` (uses npm workspaces).
3. Use `npm run dev` to start the web client; the script prebuilds
   `@kingdom-builder/contents` via `predev` to avoid missing dist files.
4. `npm run check` executes linting, type checking, and tests repository-wide.
5. `npm run build` validates production builds; run it locally only when
   necessary.
6. Restore standard PATH in shells that start minimal: `export
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`.

### 2.2 Formatting & Linting

- Run `npm run lint` to enforce mandatory braces, 80-character lines,
  descriptive identifiers, and the ~350-line limit for new modules (excluding
  `*.test.ts` files). Missing
  plugins such as `eslint-plugin-import` are auto-installed; if tooling fails,
  install with `npm install --no-save eslint-plugin-import`.
- `npm run format` runs `prettier . --write` to apply Prettier with **tab
  indentation** and an 80-character print width across TypeScript, JSON,
  Markdown, etc.
- Legacy files above 350 lines remain until refactored; new code should respect
  the limit, but `*.test.ts` files are exempt.

### 2.3 Pull Request Submission Protocol

- Every time you call the `make_pr` tool, copy the full contents of
  `.github/PULL_REQUEST_TEMPLATE.md` into the PR body and replace every
  placeholder with the specific information for the current change set.
- Before invoking `make_pr`, set the pull request title to the exact **Task
  title** shown at the top of your current assignment. This is the short,
  auto-generated summary (maximum 10 words) that Codex provides when the task
  starts—not the longer instruction text or anything you write yourself. Using
  that concise Task title verbatim keeps reviewer context aligned across tools.
- Do not trim sections from the template or leave HTML comments/placeholder
  markers in place; fill out each required section completely.
- Reviewers will immediately bounce any PR whose description omits a section
  from the template or leaves placeholders unaddressed, so confirm compliance
  before invoking `make_pr`.
- Never commit, push, or call `make_pr` until `npm run format`, `npm run lint`,
  `npm run check`, and `npm run verify` have finished without errors. Fix every
  reported issue—including spacing drift back to tabs—before you stage files.

#### Coding Standards Checklist

- [ ] Wrap every conditional or loop body in braces, even for single statements.
- [ ] Keep lines at or below 80 characters.
- [ ] Ensure files stay at or under 350 lines unless grandfathered or the file
      ends with `.test.ts`.
- [ ] Use descriptive, human-readable identifiers instead of abbreviations.
- [ ] Indent code with tabs to preserve consistent formatting.

### 2.4 Code Standards & Naming

- Prefer descriptive names; avoid one-letter identifiers except for familiar
  generic parameters.
- Expand abbreviations (e.g., `populationDefinition`, not `def`).
- Variables/functions use `camelCase`; classes/types use `PascalCase`.
- Every conditional or loop uses braces, even with single-statement bodies.
- Keep runtime-focused files (engine, shared packages, web, tests) under 350
  lines by extracting helpers where logical; `*.test.ts` files may exceed the
  limit when needed.
- Documentation (`*.md`) and non-runtime tooling (e.g., `overview.tsx`) may
  adopt context-specific formatting.

### 2.5 Testing Workflow

- Tests reside in `packages/engine/tests` (unit) and `tests/integration`
  (integration).
- Prefer high-level integration tests for complex behaviours and unit tests for
  individual handlers. Use registries to swap implementations in tests instead
  of importing concrete handlers directly.
- Execute the canonical quick suite during iterative development only:

  ```sh
  npm run test:quick >/tmp/unit.log 2>&1 && tail -n 100 /tmp/unit.log
  ```

- The command logs Vitest output to `/tmp/unit.log` and prints the tail for a
- fast sanity check while you are actively coding. It is **not** a replacement
- for the required pre-submission workflow. See
- [Agent Quick Start §1.2](docs/agent-quick-start.md#run-core-commands) for a
- condensed checklist and verification shortcuts.

- Use `npm run verify` as the default pre-submission workflow for code changes.
  It is a thin wrapper around [`scripts/run-verification.mjs`](scripts/run-verification.mjs)
  that sequentially runs `npm run check` and `npm run test:coverage`, streaming
  progress to the console while saving timestamped logs to the repository's
  `artifacts/` directory. Share those artifacts with reviewers when failures
  need triage.

- The Husky pre-push hook enforces that verification run so every push produces
  fresh artifacts. When the hook reports a tooling failure (e.g., `ENOENT`,
  missing dependencies) and executes the fallback command
  (`npm run check && npm run test:coverage`), document the underlying issue in
  your PR body before calling `make_pr`.

- If the verification script is unavailable in your environment, fall back to
  running `npm run check && npm run test:coverage` manually. Coverage runs may
  be skipped only when a change is strictly documentation-only or a pure
  content typo fix—call out the exception explicitly in the PR body so
  reviewers know it was intentional.

- The Husky pre-commit hook runs `lint-staged` followed by `npm run test:quick`.
  GitHub Actions executes `npm run test:ci` (coverage) and `npm run build` for
  each pull request.
- Obtain expectations dynamically from content or mock registries. Example unit
  pattern:

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

- Property-based example:

  ```ts
  fc.assert(
  	fc.property(resourceMapArb, (costs) => {
  		const content = createContentFactory();
  		const action = content.action({ baseCosts: costs });
  		// ...assert invariants
  	}),
  );
  ```

### 2.5 Commit Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/).
  Example: `feat(engine): add farm effect`.
- Keep commits focused; avoid mixing unrelated changes or drive-by edits.
- Update tests and documentation alongside code changes when possible.
- Keep subject lines under ~70 characters.

---

## 3. Operational Tips & Discovery Log

These notes capture environment quirks and project-specific knowledge gathered
by previous agents. Preserve them when updating this document.

- 2025-08-31: Run tests with `npm run test:quick >/tmp/unit.log 2>&1 && tail -n
100 /tmp/unit.log`; avoid running extra test commands unless specifically
  asked.
- 2025-08-31: `git commit` triggers a Husky pre-commit hook running lint-staged
  and the fast Vitest suite.
- 2025-08-31: Use `rg` for code searches; `grep -R` and `ls -R` are discouraged
  for performance.
- 2025-08-31: Registries can validate entries with Zod schemas; invalid data
  throws during `add`.
- 2025-08-31: A quick Node script can scan content files to detect duplicate
  icons across actions, buildings, stats, population roles, and developments.
- 2025-08-31: `npm run dev` prebuilds `@kingdom-builder/contents` via a `predev`
  script to avoid missing dist files.
- 2025-08-31: Player snapshots now require the engine context to include active
  passive IDs; use `snapshotPlayer(player, ctx)`.
- 2025-08-31: `handleEndTurn` will not advance phases if a player has remaining
  AP; tests must spend or clear AP first.
- 2025-08-31: Log entries include `playerId` so the web UI can style messages per
  player.
- 2025-08-31: Player log text can reuse inactive player panel hues; dark mode
  should invert to lighter shades for readability.
- 2025-08-31: To render full action cards for unlock effects, the `action:add`
  formatter should return the unlock text followed by
  `describeContent('action', id, ctx)`.
- 2025-08-31: Summary entries with a `_hoist` flag are lifted outside
  installation wrappers.
- 2025-08-31: Exporting TS interfaces from React modules can trigger Vite Fast
  Refresh incompatibility; use type-only exports instead.
- 2025-08-31: Use `rg --hidden` to search hidden directories such as `.github`.
- 2025-08-31: Use `SLOT_ICON` from `@kingdom-builder/contents` for development
  slot requirement indicators.
- 2025-08-31: Trigger handling now uses `collectTriggerEffects`; the old
  `runTrigger` helper is gone. Switch the active player index when resolving
  triggers for non-active players.
- 2025-08-31: `npm run test:coverage` (and `npm run test:ci`) require
  `@vitest/coverage-v8`; install with `npm install --no-save
@vitest/coverage-v8` if missing.
- 2025-08-31: `performAction` returns sub-action traces via `ctx.actionTraces`
  for nested log attribution.
- 2025-08-31: Use `buildInfo(registry, { id: icon })` to derive icon/label maps
  from content registries.
- 2025-08-31: Compose effects with `effect(type, method).param(key, value)`
  instead of manual `{ type, method, params }` objects.
- 2025-08-31: Content builders now chain `.id().name().icon()` and icons live on
  config entries; standalone info maps are deprecated.
- 2025-08-31: The overview screen can pull icons from contents (e.g. `ACTION_INFO`,
  `LAND_ICON`) to keep keywords visually consistent.
- 2025-10-03: `npm run lint` and test commands auto-install missing dev deps
  (`eslint-plugin-import`, `@vitest/coverage-v8`). Network access is required on
  first run in a fresh workspace.
- 2025-08-31: PlayerState maintains `statsHistory` so stats returning to zero
  remain visible; initialize new non-zero stats accordingly.
- 2025-08-31: Restore a file from the previous commit with
  `git checkout HEAD^ -- path/to/file`.
- 2025-09-01: `stat:add_pct` effects honor a `round` setting like resources; use
  `round: 'up'` to keep strength stats integer and non-negative.
- 2025-09-02: Scope result modifiers by tagging evaluators with an `id` (e.g.,
  population id `tax`) and referencing it in the modifier's `evaluation`.
- 2025-09-03: Use `diffStepSnapshots` instead of `diffSnapshots` when logging
  action results to capture resource source icons.
- 2025-09-14: PlayerState auto-initializes stats by iterating over `Stat` keys;
  adding a new stat only requires updating the `Stat` map and providing
  getters/setters.
- 2025-09-20: Frontend should serialize engine calls with a promise queue to
  prevent race conditions when dev mode advances phases rapidly.
- 2025-09-21: `EngineContext` exposes `ctx.enqueue`; use it to serialize engine
  operations.
- 2025-09-22: `setLog` functional updates read `ctx.activePlayer` at render
  time; capture the player before `setLog` to avoid misattributed log entries.
- 2025-09-15: Requirement handlers return `true` or a message;
  `getActionRequirements` collects these messages for UI prompts.
- 2025-09-16: Use the `evaluator:compare` requirement to compare numeric
  evaluator outputs without custom handlers.
- 2025-09-17: Derive requirement icons in the UI by parsing evaluator
  comparisons; see `getRequirementIcons`.
- 2025-09-18: `result_mod` accepts an `adjust` parameter to tweak evaluation
  gains like `transfer_pct`.
- 2025-09-20: Resource transfers use evaluation key `transfer_pct:percent` for
  modifier targeting.
- 2025-09-22: Clamp percentage-based resource transfers to available balance to
  avoid negative totals when modifiers exceed 100%.
- 2025-10-01: Shells may omit standard binaries; export PATH as shown in
  §2.1.
- 2025-10-05: The `compare` evaluator returns `1` when a comparison holds,
  enabling conditional effects.
- 2025-08-31: Install Node/npm if absent before running tests (see §2.1).
- 2025-10-10: The `action:perform` handler automatically snapshots for action
  traces; nested manual snapshotting is redundant.
- 2025-10-11: Building stat bonuses should use `PassiveMethods.ADD` with a
  unique id to tie their effects to the building's existence.
- 2025-10-19: Population labels live in
  `packages/contents/src/populationRoles.ts` for UI display.
- 2025-10-28: Dynamic `PlayerState` properties required disabling
  `noPropertyAccessFromIndexSignature` in `tsconfig.base.json`.
- 2025-10-28: Missing `eslint-plugin-import` causes eslint to fail; install with
  `npm install --no-save eslint-plugin-import`.
- 2025-10-28: Engine `Resource` and `Stat` constants are empty until
  `setResourceKeys`/`setStatKeys` run; use content-side keys when configuring
  tests before engine creation.
- 2025-08-31: The `attack:perform` effect parameters `ignoreAbsorption`,
  `ignoreFortification`, and nested `onDamage` effects need dedicated web
  formatters for player-facing text.
- 2025-08-31: Merge attacker and defender on-damage summaries by tagging items
  "for you" or "for opponent" instead of separate groups.
- 2025-08-31: Compact on-damage summaries further by prefixing entries with
  "You" or "Opponent".
- 2025-08-31: Suffix on-damage summary items with "for you"/"for opponent" to
  keep icons leading each line.
- 2025-10-23: Summary entries with a `_desc` flag appear under the Description
  section.
- 2025-10-29: Phase icons live in `PHASES`; retrieve them with
  `PHASES.find(p => p.id === id)?.icon` for overview displays.
- 2025-10-30: `@formkit/auto-animate` adds smooth transitions to UI lists and
  values via `useAutoAnimate`.
- 2025-08-31: Web effect formatters should import `Resource` and `Stat` from
  `@kingdom-builder/contents` to avoid undefined index errors.
- 2025-08-31: Configure runtime phase and population role enums with
  `setPhaseKeys` and `setPopulationRoleKeys` before creating the engine.
- 2025-08-31: Type re-exports from React modules can still break Vite Fast
  Refresh; move shared types to separate files.
- 2025-08-31: Engine creation requires a `rules` object; import `RULES` from
  `@kingdom-builder/contents` when initializing tests or the web context.
- 2025-08-31: Determine the default action cost resource by intersecting cost
  keys of non-system actions; expose it as `actionCostResource` in
  `GameContext` for UI use.
- 2025-08-31: Stat-add formatting can be driven by `addFormat` in `STATS` to
  supply prefixes or percentage displays.
- 2025-08-31: Detect percentage-based stats from `addFormat.percent` (or
  `displayAsPercent`) instead of hardcoding keys.

---

## 4. Architecture & System Design

### 4.1 Abstraction Guidelines

- Model behaviour through formal **Triggers** and **Effects**; avoid bespoke
  fields like `apOnUpkeep`.
- Derive expectations in tests from configuration or mocked registries, not from
  fixed numbers.
- Compose behaviour through registries that can be overridden in tests to
  demonstrate extensibility.
- Use **Evaluators** to orchestrate conditional or iterative logic. Effects can
  include an `evaluator` whose numeric result controls how many times nested
  `effects` run. Example:

  ```ts
  {
          evaluator: { type: 'development', params: { id: 'farm' } },
          effects: [{ type: 'resource', method: 'add', params: { key: 'gold', amount: 2 } }],
  }
  ```

- Define leaf effects with `type` and `method` to keep params well-typed and
  enable a uniform effect registry.
- Compose effects with helper builders such as `effect(type, method).param(key,
value)` instead of hand-written objects.

### 4.2 Trigger & Effect System

- Rules are encoded as declarative effects that respond to named triggers (e.g.,
  `onGrowthPhase`, `onBeforeAttacked`).
- When a trigger fires, `collectTriggerEffects` gathers matching effects from
  population roles, developments, buildings, passives, and actions before
  executing them via `runEffects`.
- Effect definitions include:
  - `type` – domain (`resource`, `land`, `stat`, etc.).
  - `method` – operation (`add`, `remove`, `till`, ...).
  - `params` – handler parameters; values may reference runtime arguments using
    `$placeholder` tokens.
  - `effects` – nested effects to execute.
  - `evaluator` – determines how many times nested effects execute.
  - `round` – rounding strategy (`up` or `down`) applied by handlers that work
    with fractional amounts.
- Example definitions:

  ```ts
  // Farm development: on every Growth phase gain 2 Gold
  {
    onGrowthPhase: [
      { type: 'resource', method: 'add', params: { key: 'gold', amount: 2 } }
    ]
  }

  // Nested effect with evaluator: one resource per matching development
  {
    evaluator: { type: 'development', params: { id: 'farm' } },
    effects: [{ type: 'resource', method: 'add', params: { key: 'gold', amount: 2 } }]
  }
  ```

### 4.3 Modifiers & Passives

- Some effects register temporary modifiers that adjust future costs or results.
  `cost-mod` handlers alter action costs, while `result-mod` handlers tweak
  resolved values after execution or evaluation.
- Modifiers require unique `id`s and are scoped to their owning player to avoid
  conflicts when multiple copies are active.
- Result modifiers may include an `evaluator` and target `step` to react to
  repeated events (e.g., the Mill grants +1 resource during the `gain-income`
  step for each Farm).
- Passives bundle setup/teardown effects and register modifiers with the
  `PassiveManager`. Removing a passive unregisters all related modifiers and runs
  teardown effects.

### 4.4 Registry Pattern

- Lightweight registries map string identifiers to handler functions and throw
  when unknown ids are requested.
- Core registries include actions, buildings, developments, populations,
  requirements, `EFFECTS`, and `EVALUATORS`.
- Registries are intentionally mutable so tests or mods can add/replace entries
  at runtime.

### 4.5 Package Layout

- `packages/engine` – core game logic, effect handlers, registries, tests.
- `packages/contents` – default game data (actions, buildings, phases, starting
  setup) without executable logic.
- `packages/web` – Vite + React client rendering the game.
- Keep configuration in `contents` and runtime logic in `engine`/`web`. Tests
  derive expectations from the active configuration.

### 4.6 Engine Systems Reference

Use this catalogue to decide which system models a mechanic. Each entry lists
its definition, typical usage, and contrast with related systems.

- **Resources**
  - Definition: Numeric pools keyed by string, stored in each player's
    `resources` map and exposed as properties. Modified by effects like
    `resource:add`, `resource:remove`, or `resource:transfer` (which may involve
    rounding rules and passive modifiers).
  - Use: Consumable currencies (gold, action points, happiness) that are spent
    via costs and regenerated by effects or triggers.
  - Contrast: Unlike stats, resources are typically paid or gained outright and
    only go negative when explicitly permitted.
- **Stats**
  - Definition: Numeric attributes stored in `stats` with a parallel
    `statsHistory` to track whether a stat has ever been non-zero. Modified via
    `stat:add`, `stat:remove`, or `stat:add_pct` (which caches base values per
    step for additive scaling).
  - Use: Long-term capabilities (army strength, fortification, absorption) that
    drive comparisons or scaling.
  - Contrast: Stats are rarely "paid"; they represent abilities or limits rather
    than currency.
- **Population**
  - Definition: Counts of individuals per role stored in a `population` map.
    Roles trigger `onAssigned`/`onUnassigned`/phase effects. Modified with
    `population:add`/`population:remove`, which also fire role effects and
    passives.
  - Use: Workers/units such as Council or Legion, granting income, bonuses, or
    triggered effects.
  - Contrast: Population is discrete, cannot be fractional, and is capped by
    rules (pop cap) rather than history.
- **Buildings**
  - Definition: Global structures recorded in a player's `buildings` set.
    Configurations include costs and trigger lists (`onBuild`, `onGrowthPhase`,
    etc.). Managed via `building:add`/`building:remove`, which may add/remove
    passives.
  - Use: Persistent bonuses, cost/result modifiers, triggered effects, or action
    grants.
  - Contrast: Unlike developments, buildings are not tied to land slots.
- **Developments**
  - Definition: Improvements tied to specific land tiles. Each land tracks
    `slotsMax`, `slotsUsed`, and a list of development IDs. Managed with
    `development:add`/`development:remove`; may register passives and affect
    stats or population caps.
  - Use: Territory upgrades (farms, houses) providing localized benefits.
  - Contrast: Developments consume land slots and are land-specific; unlike
    resources/stats they are discrete objects.
- **Lands & Development Slots**
  - Definition: `Land` objects track slot counts, tilling state, and development
    IDs. New land is created via `land:add`; slots increase through `land:till`
    up to configured maxima.
  - Use: Limit how many developments can be built; expanding/tilling increases
    capacity.
  - Contrast: Slots resemble discrete capacity, while stats like `maxPopulation`
    provide global numeric limits.
- **Actions**
  - Definition: Player-initiated sequences defined by id, name, base costs,
    requirements, and effect lists. Performing an action evaluates requirements,
    computes costs, pays them, executes effects, applies modifiers, and logs
    traces.
  - Use: Explicit player choices (expand, raise population, attack).
  - Contrast: Actions wrap many effects and include cost/requirement handling;
    effects alone do not.
- **Effects**
  - Definition: Atomic operations identified by `type` and `method` with optional
    params, nested effects, or evaluators. Managed by the `EffectRegistry` and
    executed by `runEffects`. Used in actions, passives, triggers, or
    requirements.
  - Use: State mutations (resource/stat changes, population shifts, attack
    resolution, passive management).
  - Contrast: Effects have no inherent cost or requirement logic—they are
    building blocks.
- **Triggers**
  - Definition: Named events in the game flow. When triggered, matching effect
    lists are collected and run automatically.
  - Use: Automatic or phase-based effects like upkeep income or attack
    reactions.
  - Contrast: Require no player input or costs (unlike actions) and are momentary
    rather than persistent (unlike passives).
- **Requirements**
  - Definition: Preconditions checked before performing actions, returning `true`
    or an error message. Defined by type, method, params, and optional message.
  - Use: Ensure prerequisites (e.g., population less than max) are met.
  - Contrast: Pure checks; they do not consume resources or change state.
- **Costs**
  - Definition: Resource expenditures built from base action costs plus
    additional sources, adjusted by modifiers before payment.
  - Use: Limit action frequency by consuming resources or AP.
  - Contrast: Different from requirements (checks) and modifiers (adjustments).
- **Modifiers**
  - Definition: Functions that modify costs, action results, or evaluation
    outcomes, registered with `PassiveManager` as cost/result/evaluation
    modifiers.
  - Use: Discounts, bonus gains, altered attack power.
  - Contrast: Modifiers are inert until registered via passives.
- **Passives**
  - Definition: Persistent bundles stored in `PassiveManager`. Adding a passive
    runs setup effects and registers modifiers; removing it runs teardown effects
    and unregisters modifiers.
  - Use: Ongoing buffs/debuffs or conditional triggers granted by buildings,
    population roles, etc.
  - Contrast: Distinct from one-shot effects and from static buildings/
    developments.
- **Modifiers vs. Passives**
  - Modifiers are the functional hooks adjusting costs/results/evaluations.
    Passives are containers that manage modifier lifecycles and may run other
    effects.

### 4.7 Game Overview & Flow

- The game is a turn-based 1v1 strategy duel. Player A acts first; Player B
  receives compensatory boosts defined in `contents/src/game.ts` (e.g., extra AP
  on their first Growth phase).
- Turns consist of three phases: **Growth**, **Upkeep**, and **Main**.
  - Growth Phase: Collect income, gain action points, and grow military stats.
  - Upkeep Phase: Pay upkeep, resolve end-of-phase triggers.
  - Main Phase: Spend action points on actions (expand, develop, attack, etc.).
  - During Main Phase, both players select actions secretly; once locked, Player
    A resolves actions in order followed by Player B.

### 4.8 Core Mechanic Definitions

- Actions consist of zero or more **Costs**, zero or more **Requirements**, and
  one or more **Effects**. Effects may also trigger other actions (without
  paying their costs).
- **Costs** consume resources (gold, AP, happiness, castle HP) when an action is
  manually performed.
- **Requirements** can target any domain (resources, stats, buildings) and must
  pass before an action can execute.
- **Effects** can be one-time or persistent, triggered by phases/events, or
  conditional via evaluators.
- **Resources** behave like currencies with fluctuating values.
- **Buildings** provide passive bonuses or triggers.
- **Land** represents territory with development slots. Slots can increase via
  effects such as tilling.
- **Developments** occupy slots on land and provide one-time or persistent
  effects.
- **Stats** represent qualities (max population, army strength) rather than
  spendable currency.

### 4.9 Trigger vs. Global Effects

- **Trigger effects** respond to events (e.g., "On Growth Phase: gain 2 gold").
- **Global effects** remain active continuously and usually modify other
  effects, such as "All gold gain increased by 25%".

### 4.10 Population Roles

- Population archetypes: **Council**, **Legion**, **Fortifier**, **Citizen**.
- Council grants 1 AP at the end of each Growth Phase (trigger effect).
- Legion provides +1 Army Strength passively and +25% Army Strength growth each
  Growth Phase (trigger effect that stacks permanently).
- Fortifier provides +1 Fortification Strength passively and +25% Fortification
  growth each Growth Phase.
- Citizens are unassigned with no benefits until moved into a role.
- Removing a role-dependent population member removes its global effects but not
  past permanent stat increases.

### 4.11 Start-of-Game Setup (Engine Baseline)

- Castle health: 10.
- Max population stat: 1.
- Land: two tiles (one empty slot, one containing a Farm development granting 2
  gold each Growth Phase).
- Population: one Council member.
- Resources: 10 gold, 0 happiness, 0 army strength, 0 fortification strength.

---

## 5. Engine Implementation Notes

- Need module breadcrumbs for combat, passive stacking, or session lifecycle?
  Jump to [`docs/architecture/navigation-cheatsheet.md`](docs/architecture/navigation-cheatsheet.md)
  for a quick index of the go-to engine and server files.
- Keep that cheatsheet updated when new selectors or registries are added so it
  remains trustworthy for future agents.

### 5.1 Effect Registry

- Effect handlers live in the `EFFECTS` registry and are keyed by
  `type:method` pairs (e.g., `resource:add`, `land:till`).
- Core handlers register via `registerCoreEffects()` during engine bootstrap.
- External modules can add handlers before actions execute:

  ```ts
  import { EFFECTS } from './effects';

  EFFECTS.add('castle:heal', (effect, ctx, mult) => {
  	const amt = (effect.params?.amount ?? 0) * mult;
  	ctx.activePlayer.resources['castleHP'] += amt;
  });
  ```

- Once registered, actions can reference `{ type: 'castle', method: 'heal',
params: { amount: 5 } }`.
- Built-in modifiers:
  - `cost-mod` effects adjust resource costs of matching actions.
  - `result-mod` effects tweak resolved values or evaluation outcomes.
  - Modifiers require unique ids and are scoped per player to prevent conflicts.

### 5.2 Evaluator Registry

- Evaluators compute numbers used by effects and modifiers to determine how
  often nested effects run.
- Core evaluators register via `registerCoreEvaluators()` (includes the
  `development` evaluator).
- Add custom evaluators before running effects:

  ```ts
  import { EVALUATORS, EvaluatorHandler } from './evaluators';

  const doubleGold: EvaluatorHandler<number> = (def, ctx) =>
  	ctx.activePlayer.resources['gold'] * 2;

  EVALUATORS.add('doubleGold', doubleGold);
  ```

- Effects can then reference `{ evaluator: { type: 'doubleGold' }, effects: [...] }`.

---

## 6. Frontend Translation Layer

- The web client converts engine definitions into player-facing text through a
  layered translation system to keep UI strings decoupled from data.
- **Read `docs/text-formatting.md` before adding or changing user-facing
  wording.** It explains the translator pipeline, inventories existing
  formatters, and lists the canonical verbs/icons that keep UI copy consistent.

### 6.1 Effect Formatters

- Located under `packages/web/src/translation/effects`.
- Register formatters with `registerEffectFormatter('type', 'method', { ... })`
  to describe how to summarize, describe, and log an effect.
- Common helper verbs (e.g., `gainOrLose`, `increaseOrDecrease`) live in
  `effects/helpers.ts` to maintain consistent wording.

### 6.2 Content Translators

- Register translators via `registerContentTranslator` in
  `packages/web/src/translation/content`.
- Translators implement `summarize` and `describe`, composing other translators
  when helpful (e.g., `PhasedTranslator`, `withInstallation`). Optional `log`
  methods produce flat log lines.
- Consumers call `summarizeContent`, `describeContent`, or `logContent` and the
  factory dispatches to the correct translator.
- Adding a new content type requires implementing and registering another
  translator module.

### 6.3 Logging Helpers

- `snapshotPlayer` and `diffSnapshots` (or `diffStepSnapshots` for action
  results) capture before/after state and emit human-readable strings (e.g.,
  `Gold +2 (10→12)`).
- Phase headings draw from `triggerInfo`, which provides both `future` labels
  ("On each Growth Phase") and `past` labels ("Growth Phase").
- Serialize engine calls with a promise queue and use `ctx.enqueue` to avoid
  race conditions when phases advance rapidly in development mode.
- Import `Resource` and `Stat` from `@kingdom-builder/contents` when formatting
  effects to avoid undefined index errors.
