# Game Content Configurations

## 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** Any resource/stat keys or default values shown in these configuration files are subject to change and must not be referenced directly in other domains.
- **Tests may not rely on literals.** Always read required ids and values from the content registry or mocks so that changing these configs does not break tests unless it uncovers missing engine support.

This directory holds the flexible configuration files that define the default game content:
Actions, Buildings, Developments and Populations. These files are meant to be tweaked
frequently during playtesting or balancing. Only the _structure_ of the objects must obey
engine schemas; the actual values, triggers and effects may change freely without impacting
the core engine.

## Phases & Steps

Turn flow is fully data‑driven through `phases.ts`. Each phase lists an ordered set of
steps. A step may define a `title`, optional `effects` and optional `triggers`:

- **effects** – resolved immediately when the step runs. Complex behaviour is composed
  with nested effects and `evaluator` helpers. For example, the `pay-upkeep` step removes
  gold per population role by using the `population` evaluator.
- **triggers** – collect matching `onXPhase` effects from all active content (population,
  developments, buildings). These are resolved in a dedicated `Resolve dynamic triggers`
  step at the start of each phase so additional phase‑based rules can be added without
  touching engine code.

By editing the phase configuration you can add, remove or reorder phases and steps, adjust
upkeep costs or introduce entirely new mechanics. The engine and frontend consume this
configuration dynamically.

To add new content or adjust existing entries, edit the files here or copy them as a starting
point for your own configuration set.
