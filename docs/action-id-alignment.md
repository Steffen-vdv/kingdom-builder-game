# Action ID Alignment

## Architectural intent

Separating **actions** from the **effects** they invoke keeps the engine focused on
interpreting declarative content while leaving balancing and presentation inside the
content package. Content definitions own the identifiers, costs, and UI metadata
that players see, while the engine simply resolves those IDs and executes the
referenced effects without hard-coded assumptions.【F:docs/domain-boundaries.md†L12-L141】
Migrating away from composite commands such as the generic `build`, `develop`,
and `raise_pop` actions gives each upgrade, structure, or hire assignment its own
stable action identifier. Dedicated IDs let registries expose accurate costs,
requirements, category ordering, and focus metadata per action, and they keep
passives, modifiers, and UI lookups scoped to the exact button a player clicked.

## Canonical action-id naming

New action IDs follow predictable, lowercase snake-case verbs that describe the
player intent. The canonical prefix depends on the target type:

- `develop_<development-id>` for land upgrades (e.g., `develop_house`).
- `build_<building-id>` for construction (e.g., `build_mill`).
- `hire_<population-role>` for population growth or reassignment (e.g., `hire_legion`).

The suffix uses the existing content identifier for the development, building, or
population role so downstream systems can derive icons, translations, and
modifiers without extra mapping.

## Legacy composite behaviour reference

Before alignment, three composite actions carried the shared configuration for
all developments, buildings, and population roles:

- **Develop** – `ActionId.develop` cost 1 AP and 3 gold, targeted a specific
  development and land, belonged to the `develop` category, and was marked with an
  Economy focus.【F:packages/contents/src/actions/basicActions.ts†L73-L88】
- **Build** – `ActionId.build` forwarded to a selected building definition,
  inheriting the building-specific costs and upkeep while staying in the `build`
  category with neutral focus.【F:packages/contents/src/actions/specialActions.ts†L231-L244】【F:packages/contents/src/buildings.ts†L53-L210】
- **Hire** – `ActionId.raise_pop` cost 1 AP and 5 gold, required available housing,
  added the chosen role, and granted +1 happiness within the `hire` category.【F:packages/contents/src/actions/basicActions.ts†L121-L149】

Dedicated action IDs must retain these defaults unless a specific content entry
overrides them.

## Develop category actions

All land developments listed below require standalone actions. Each action stays
in the `develop` category, costs 1 AP and 3 gold, and targets a land slot using
`developmentParams().landId('$landId')`. The shared effect grants the development
and triggers its on-build hooks from the registry.【F:packages/contents/src/actions/basicActions.ts†L73-L88】【F:packages/contents/src/developments.ts†L37-L135】

| Action ID            | Development ID | Default costs | Additional behaviour                                                                                                        |
| -------------------- | -------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `develop_farm`       | `farm`         | 1 AP, 3 gold  | Income step grants 2 gold when evaluated.【F:packages/contents/src/developments.ts†L37-L55】                                |
| `develop_house`      | `house`        | 1 AP, 3 gold  | +1 max population on build.【F:packages/contents/src/developments.ts†L58-L72】                                              |
| `develop_outpost`    | `outpost`      | 1 AP, 3 gold  | +1 army and +1 fortification strength on build.【F:packages/contents/src/developments.ts†L75-L94】                          |
| `develop_watchtower` | `watchtower`   | 1 AP, 3 gold  | +2 fortification, +0.5 absorption; removes itself after defending once.【F:packages/contents/src/developments.ts†L96-L124】 |
| `develop_garden`     | `garden`       | 1 AP, 3 gold  | System development; behaviour defined solely by registry hooks.【F:packages/contents/src/developments.ts†L126-L135】        |

## Build category actions

Every building below receives a dedicated action ID in the `build` category. The
legacy composite did not apply a universal cost; instead, each action should load
its cost, upkeep, and passive hooks from the building definition itself.【F:packages/contents/src/actions/specialActions.ts†L231-L244】【F:packages/contents/src/buildings.ts†L53-L210】

| Action ID              | Building ID      | Default costs & upkeep      | Shared behaviour expectations                                                                                               |
| ---------------------- | ---------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `build_town_charter`   | `town_charter`   | 5 gold                      | Grants cost/result modifiers that boost `expand` and +1 happiness on build.【F:packages/contents/src/buildings.ts†L53-L83】 |
| `build_mill`           | `mill`           | 7 gold                      | Grants +1 Farm income via result modifier.【F:packages/contents/src/buildings.ts†L85-L104】                                 |
| `build_raiders_guild`  | `raiders_guild`  | 8 gold, 1 AP; upkeep 1 gold | Adds +25% plunder transfer modifier.【F:packages/contents/src/buildings.ts†L105-L130】                                      |
| `build_plow_workshop`  | `plow_workshop`  | 10 gold                     | Unlocks the `plow` system action on build.【F:packages/contents/src/buildings.ts†L131-L145】                                |
| `build_market`         | `market`         | 10 gold                     | Adds +1 tax yield via result modifier.【F:packages/contents/src/buildings.ts†L146-L165】                                    |
| `build_castle_walls`   | `castle_walls`   | 12 gold                     | Adds passive boosting fortification and absorption.【F:packages/contents/src/buildings.ts†L166-L189】                       |
| `build_barracks`       | `barracks`       | 12 gold                     | Focus: Aggressive; no additional hooks beyond registry definition.【F:packages/contents/src/buildings.ts†L191-L210】        |
| `build_citadel`        | `citadel`        | 12 gold                     | Focus: Defense; uses registry defaults.【F:packages/contents/src/buildings.ts†L191-L210】                                   |
| `build_castle_gardens` | `castle_gardens` | 15 gold                     | Focus: Economy; relies on registry defaults.【F:packages/contents/src/buildings.ts†L191-L210】                              |
| `build_temple`         | `temple`         | 16 gold                     | Focus: Other; registry-defined behaviour only.【F:packages/contents/src/buildings.ts†L191-L210】                            |
| `build_palace`         | `palace`         | 20 gold                     | Focus: Other; registry-defined behaviour only.【F:packages/contents/src/buildings.ts†L191-L210】                            |
| `build_great_hall`     | `great_hall`     | 22 gold                     | Focus: Other; registry-defined behaviour only.【F:packages/contents/src/buildings.ts†L191-L210】                            |

## Hire category actions

Population recruitment and assignment must likewise use discrete action IDs in
the `hire` category. Each action inherits the composite defaults: 1 AP and 5 gold
costs, the max-population requirement, and +1 happiness on success. The action
parameters specify the role being hired so role-specific passives continue to fire.【F:packages/contents/src/actions/basicActions.ts†L121-L149】【F:packages/contents/src/populations.ts†L47-L127】

| Action ID        | Population role | Default costs | Requirements     | Role behaviour carried forward                                                                                   |
| ---------------- | --------------- | ------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `hire_council`   | `council`       | 1 AP, 5 gold  | Population < max | Grants +1 AP each gain AP step; upkeep 2 gold.【F:packages/contents/src/populations.ts†L50-L70】                 |
| `hire_legion`    | `legion`        | 1 AP, 5 gold  | Population < max | Adds passive for +1 army strength and upkeep 1 gold.【F:packages/contents/src/populations.ts†L74-L97】           |
| `hire_fortifier` | `fortifier`     | 1 AP, 5 gold  | Population < max | Adds passive for +1 fortification strength and upkeep 1 gold.【F:packages/contents/src/populations.ts†L99-L122】 |

## Shared behaviours

- **Category order & focus** – Preserve the existing ordering and focus values
  when migrating to dedicated actions so UI grids and advisor prompts remain
  stable.【F:packages/contents/src/actions/basicActions.ts†L47-L149】【F:packages/contents/src/actions/specialActions.ts†L231-L244】
- **Cost/requirement overrides** – Dedicated actions may still apply additional
  modifiers (cost-mods, requirements) on top of the defaults by referencing
  building/development/population metadata or by adding new effect hooks.
- **System unlocks** – Buildings that unlock system actions (e.g., `plow`) or
  attach passives must continue to do so through their registry definitions so the
  engine keeps effect execution decoupled from the new action IDs.【F:packages/contents/src/buildings.ts†L105-L145】

Following this plan keeps the registry architecture consistent while giving every
player-facing button a stable, content-driven identifier.
