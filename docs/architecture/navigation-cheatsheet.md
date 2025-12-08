# Architecture Navigation Cheatsheet

Use this as a jumping-off point when you need to track how combat, passives, and sessions stitch together. Each entry lists the canonical module plus the role it plays so you can dive straight to the right layer.

## Combat Resolution

- **`packages/engine/src/effects/attack.ts`** – Entry effect that pulls attacker/defender state, applies evaluation modifiers, and kicks off `resolveAttack` before logging on-damage hooks.【F:packages/engine/src/effects/attack.ts†L1-L86】
- **`packages/engine/src/effects/attack/resolve.ts`** – Core calculator for absorption, fortification, and post-trigger sweeps; expects `RULES` values (cap, rounding) to be preloaded before running fights.【F:packages/engine/src/effects/attack/resolve.ts†L1-L120】
- **`packages/engine/src/effects/attack_target_handlers/index.ts`** – Dispatch table for resource/building targets; use this when adding new attack surfaces or evaluation keys.【F:packages/engine/src/effects/attack_target_handlers/index.ts†L1-L51】
- **`packages/engine/src/effects/attack/snapshot_diff.ts`** – Utility diffing attacker/defender snapshots so logs surface resource shifts during combat.【F:packages/engine/src/effects/attack/snapshot_diff.ts†L1-L48】
- **Registries to preload** – `RULES`, `PHASES`, and any attack-target metadata from `@kingdom-builder/contents` must be loaded before invoking `attack:perform` so evaluation hooks resolve correctly.

## Passive Stacking & Modifiers

- **`packages/engine/src/services/passive_manager.ts`** – Central manager for registering passives plus cost/result/evaluation modifiers and skip flags; orchestrates stacking and resource modification.【F:packages/engine/src/services/passive_manager.ts†L1-L125】
- **`packages/engine/src/services/passive_helpers.ts`** – Clone/reverse utilities that keep passive metadata, teardown effects, and skip scaffolding consistent when adding/removing stacks.【F:packages/engine/src/services/passive_helpers.ts†L1-L116】
- **`packages/engine/src/effects/passive_add.ts`** – Effect surface for injecting passives (incl. growth/upkeep triggers); call this from buildings, developments, or tier scripts when you need a new stack.【F:packages/engine/src/effects/passive_add.ts†L21-L87】
- **`packages/engine/src/effects/result_mod.ts`** – Registers result/evaluation modifiers tied to passives; pair with the manager when adding custom stacking math.【F:packages/engine/src/effects/result_mod.ts†L1-L55】
- **Preload helpers** – Pull passive templates from `@kingdom-builder/contents` (e.g., tier definitions, passive registries) or seed them via `createContentFactory()` before tests so modifiers have ids and icons ready.

## Happiness Thresholds

- **`packages/engine/src/services/services.ts`** – `handleTieredResourceChange` swaps passive stacks when happiness crosses a tier boundary and applies enter/exit effects plus passive metadata. Call `initializeTierPassives` after bootstrapping sessions so cached stacks reflect the starting happiness value.【F:packages/engine/src/services/services.ts†L1-L135】
- **`packages/web/src/components/player/PassiveDisplay.tsx`** – Reads the tiered resource metadata to highlight the active tier and surface removal copy in hover tooltips. Keep summary tokens in tier definitions aligned with the UI expectations.【F:packages/web/src/components/player/PassiveDisplay.tsx†L76-L190】
- **`tests/integration/happiness-tier-content.test.ts`** – Snapshot guard that verifies tier metadata, passive payloads, and skip markers stay in sync. Update it whenever tier ranges, effects, or text change.【F:tests/integration/happiness-tier-content.test.ts†L1-L214】

## Server Session Management

- **`packages/server/src/session/SessionManager.ts`** – Source of truth for creating, caching, and snapshotting engine sessions; clones registries and merges optional overrides on boot.【F:packages/server/src/session/SessionManager.ts†L1-L126】
- **`packages/server/tests/helpers/createSyntheticSessionManager.ts`** – Test scaffold that seeds synthetic actions, phases, and rules via `createContentFactory()`; reuse when spinning up isolated sessions.【F:packages/server/tests/helpers/createSyntheticSessionManager.ts†L1-L109】
- **`packages/engine/src/setup/create_engine.ts`** – Engine bootstrap that wires `PassiveManager`, registries, and services; server sessions call through here, so update this when changing startup requirements.【F:packages/engine/src/setup/create_engine.ts†L157-L180】
- **`packages/engine/src/runtime/session.ts`** – Handles snapshot cloning and evaluation modifier persistence so server calls stay deterministic across requests.【F:packages/engine/src/runtime/session.ts†L23-L178】
- **Registries to preload** – Ensure `ACTIONS`, `BUILDINGS`, `DEVELOPMENTS`, `POPULATIONS`, `RESOURCES`, and `RULES` are available before `SessionManager` bootstraps, or provide explicit overrides via `engineOptions`.
