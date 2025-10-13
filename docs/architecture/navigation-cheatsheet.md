# Architecture Navigation Cheatsheet

Use this as a jumping-off point when you need to track how combat, passives, and sessions stitch together. Each entry lists the canonical module plus the role it plays so you can dive straight to the right layer.

## Combat Resolution

- **`packages/engine/src/effects/attack.ts`** – Entry effect that pulls attacker/defender state, applies evaluation modifiers, and kicks off `resolveAttack` before logging on-damage hooks.【F:packages/engine/src/effects/attack.ts†L1-L86】
- **`packages/engine/src/effects/attack/resolve.ts`** – Core calculator for absorption, fortification, and post-trigger sweeps; expects `RULES` values (cap, rounding) to be preloaded before running fights.【F:packages/engine/src/effects/attack/resolve.ts†L1-L120】
- **`packages/engine/src/effects/attack_target_handlers/index.ts`** – Dispatch table for resource/stat/building targets; use this when adding new attack surfaces or evaluation keys.【F:packages/engine/src/effects/attack_target_handlers/index.ts†L1-L51】
- **`packages/engine/src/effects/attack/snapshot_diff.ts`** – Utility diffing attacker/defender snapshots so logs surface resource/stat shifts during combat.【F:packages/engine/src/effects/attack/snapshot_diff.ts†L1-L48】
- **Registries to preload** – `RULES`, `PHASES`, and any attack-target metadata from `@kingdom-builder/contents` must be loaded before invoking `attack:perform` so evaluation hooks resolve correctly.

## Passive Stacking & Modifiers

- **`packages/engine/src/services/passive_manager.ts`** – Central manager for registering passives plus cost/result/evaluation modifiers and skip flags; orchestrates stacking with stat frames.【F:packages/engine/src/services/passive_manager.ts†L1-L125】
- **`packages/engine/src/services/passive_helpers.ts`** – Clone/reverse utilities that keep passive metadata, teardown effects, and skip scaffolding consistent when adding/removing stacks.【F:packages/engine/src/services/passive_helpers.ts†L1-L116】
- **`packages/engine/src/effects/passive_add.ts`** – Effect surface for injecting passives (incl. growth/upkeep triggers); call this from buildings, developments, or tier scripts when you need a new stack.【F:packages/engine/src/effects/passive_add.ts†L21-L87】
- **`packages/engine/src/effects/result_mod.ts`** – Registers result/evaluation modifiers tied to passives; pair with the manager when adding custom stacking math.【F:packages/engine/src/effects/result_mod.ts†L1-L55】
- **Preload helpers** – Pull passive templates from `@kingdom-builder/contents` (e.g., tier definitions, passive registries) or seed them via `createContentFactory()` before tests so modifiers have ids and icons ready.

## Server Session Management

- **`packages/server/src/session/SessionManager.ts`** – Source of truth for
  creating, caching, and snapshotting engine sessions. Deep-clones registries,
  builds resource descriptors, and exposes `getRegistries()`/`getBaseMetadata()`
  so transports can ship authoritative metadata with each snapshot.【F:packages/server/src/session/SessionManager.ts†L1-L214】
- **`packages/server/src/session/sessionMetadata.ts`** – Normalizes registry data
  into `SessionSnapshotMetadata`, wiring resources, stats, triggers, land/slot
  descriptors, and phase outlines into immutable payloads that client code can
  consume without content imports.【F:packages/server/src/session/sessionMetadata.ts†L1-L169】
- **`packages/server/tests/helpers/createSyntheticSessionManager.ts`** – Test
  scaffold that seeds synthetic actions, phases, and rules via
  `createContentFactory()`; reuse when spinning up isolated sessions.【F:packages/server/tests/helpers/createSyntheticSessionManager.ts†L1-L109】
- **`packages/engine/src/setup/create_engine.ts`** – Engine bootstrap that wires
  `PassiveManager`, registries, and services; server sessions call through here,
  so update this when changing startup requirements.【F:packages/engine/src/setup/create_engine.ts†L157-L180】
- **`packages/engine/src/runtime/session.ts`** – Handles snapshot cloning and
  evaluation modifier persistence so server calls stay deterministic across
  requests.【F:packages/engine/src/runtime/session.ts†L23-L178】
- **Metadata distribution** – Preload `ACTIONS`, `BUILDINGS`, `DEVELOPMENTS`,
  `POPULATIONS`, `RESOURCES`, `RULES`, and `GAME_START` before boot so
  `SessionManager` can serialize them once and share the clones. Downstream
  consumers should request registries and `snapshot.metadata` from the
  transport rather than importing `@kingdom-builder/contents` directly.
