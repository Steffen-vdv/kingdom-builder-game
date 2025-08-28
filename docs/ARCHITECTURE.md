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

See the [evaluator registry README](../packages/engine/src/evaluators/README.md)
for details on built-in handlers and registering custom ones.

## Registry Pattern

Most subsystems rely on lightweight registries. A `Registry` maps string
identifiers to handler functions and throws if an unknown id is requested. Core
registries include the actions, buildings, developments and populations
registries alongside `EFFECTS` and `EVALUATORS`.

Registries are intentionally mutable: tests or mods may replace entries or add
new ones at runtime. This allows contributors to prototype new mechanics simply
by registering additional handlers rather than modifying engine code. When
testing, prefer overriding registries instead of stubbing modules.

## Package Layout

The repository uses a monorepo under `packages/`:

- `packages/engine` – game rules, registries, effect handlers and tests.
- `packages/web` – Vite + React client consuming the engine.

Shared configuration files live at the repository root. Adding a new package or
library should follow the same structure so shared tooling continues to work.

## Extending the Engine

To introduce new behaviour:

1. Register any new effect or evaluator handlers before creating the engine.
2. Define actions, developments, buildings or populations that use those
   handlers via effect definitions.
3. Write tests demonstrating the new content by overriding registries where
   necessary.

By leaning on triggers, effects and registries, almost any rule can be added
purely through data.
