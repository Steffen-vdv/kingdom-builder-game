# Package Overview

## 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** Resource or stat keys, starting amounts and effect behaviour must come from the `contents` package so designs can change freely.
- **Tests may not rely on literals.** Always read values from the Content domain or mock registries; changes in content should not break tests unless they reveal missing engine support.

This directory houses the monorepo packages:

- **engine** – core game logic, effect handlers and registries. No game content
  or hardcoded values live here; behaviour derives entirely from supplied
  configuration.
- **contents** – default game data such as actions, buildings, phases and
  starting setup. It contains no processing logic and is intended to be tweaked
  by non‑technical contributors.
- **web** – React frontend that renders the game. It queries the engine and, when
  needed, reads data directly from the contents package.

Keep configuration files inside `contents` and runtime logic inside `engine` or
`web`. Tests should derive expectations from the active configuration rather
than hardcoded numbers so that content tweaks do not invalidate tests.
