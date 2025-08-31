# Architecture Overview

The kingdom builder engine is designed for flexibility and extensibility.
This document outlines the core systems that make it easy to bolt on new
content without touching existing logic.

## Trigger/Effect System

Rules and content are encoded as declarative **effects** that respond to
specific **triggers**. A trigger represents a moment in the game such as the
start of the Development phase or the resolution of an action. When a trigger
fires the engine looks up all matching effects and resolves them through the
central registry.

Each effect definition contains:

- `type` – the domain being affected (`resource`, `land`, `stat`, etc.)
- `method` – the operation to perform within that domain (`add`, `remove`,
  `till`, ...)
- `params` – optional parameters required by the handler
- `effects` – optional nested effects to execute
- `evaluator` – optional definition determining how many times `effects` run
- `round` – optional rounding strategy (`up` or `down`) applied by some
  handlers when working with fractional amounts

Values in `params` may reference runtime arguments using a `$placeholder`
syntax. These placeholders are substituted before execution so the same effect
definitions can be reused with different data.

The engine processes effects with `runEffects`:

```ts
// Farm development: on every Development phase gain 2 Gold
{
  onDevelopmentPhase: [
    { type: "resource", method: "add", params: { key: "gold", amount: 2 } }
  ]
}

// Nested effect with evaluator: one resource per matching development
{
  evaluator: { type: "development", params: { id: "farm" } },
  effects: [{ type: "resource", method: "add", params: { key: "gold", amount: 2 } }]
}
```

The evaluator returns a multiplier that determines how often the nested effects
run. Because triggers are decoupled from effect domains, any trigger can result
in any effect, keeping behaviour entirely data‑driven.

See the [evaluator registry README](../../packages/engine/src/evaluators/AGENTS.md)
for details on built-in handlers and registering custom ones.

## Modifiers

Some effects register temporary modifiers that adjust future costs or results.
`cost-mod` handlers alter the cost of matching actions, while `result-mod`
handlers tweak evaluated amounts after a step resolves. Each modifier is
identified by an `id` and scoped to its owning player so multiple copies of the
same building do not collide.

Result modifiers may also supply an `evaluator` and target `step` to react to
repeated events. The Mill uses this to grant +1 of whatever resource each Farm
produces during the `gain-income` step.

## Registry Pattern

Most subsystems rely on lightweight registries. A `Registry` maps string
identifiers to handler functions and throws if an unknown id is requested. Core
registries include the actions, buildings, developments, populations and
requirements registries alongside `EFFECTS` and `EVALUATORS`.

Registries are intentionally mutable: tests or mods may replace entries or add
new ones at runtime. This allows contributors to prototype new mechanics simply
by registering additional handlers rather than modifying engine code. When
testing, prefer overriding registries instead of stubbing modules.

## Package Layout

The repository uses a monorepo under `packages/`:

- `packages/contents` – default game configuration edited by live-ops. Contains
  no logic; only data such as actions, buildings, phases and translations.
- `packages/engine` – game rules, registries, effect handlers and tests. The
  engine consumes configuration and never hard codes content.
- `packages/web` – Vite + React client consuming the engine and content.

Shared configuration files live at the repository root. Adding a new package or
library should follow the same structure so shared tooling continues to work.

## Extending the Engine

To introduce new behaviour:

1. Register any new effect, evaluator or requirement handlers before creating
   the engine.
2. Define actions, developments, buildings or populations that use those
   handlers via effect definitions.
3. Write tests demonstrating the new content by overriding registries where
   necessary.

By leaning on triggers, effects and registries, almost any rule can be added
purely through data.

## Frontend Translation Layer

The web client uses a dedicated translation layer to convert engine data into
player-facing strings. Effect formatters and content translators follow
registry-based factories to keep UI code decoupled from game logic. See
[FRONTEND_TRANSLATION](../frontend_translation/AGENTS.md) for details on extending the
system.
