# Package Overview

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
