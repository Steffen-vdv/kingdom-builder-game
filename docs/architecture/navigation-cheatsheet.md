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

- **`packages/server/src/session/SessionManager.ts`** – Source of truth for creating, caching, and snapshotting engine sessions; clones registries and merges optional overrides on boot. Integrates with persistence layer for session recovery.
- **`packages/server/tests/helpers/createSyntheticSessionManager.ts`** – Test scaffold that seeds synthetic actions, phases, and rules via `createContentFactory()`; reuse when spinning up isolated sessions.
- **`packages/engine/src/setup/create_engine.ts`** – Engine bootstrap that wires `PassiveManager`, registries, and services; server sessions call through here, so update this when changing startup requirements.
- **`packages/engine/src/runtime/session.ts`** – Handles snapshot cloning and evaluation modifier persistence so server calls stay deterministic across requests.
- **Registries to preload** – Ensure `ACTIONS`, `BUILDINGS`, `DEVELOPMENTS`, `RESOURCES`, and `RULES` are available before `SessionManager` bootstraps, or provide explicit overrides via `engineOptions`.

## Session Persistence

Sessions survive server restarts and in-memory timeouts via SQLite persistence with action log replay.

### Architecture

```
SessionManager ──► SessionPersistence ──► SQLite (session_snapshots table)
      │                                           │
      └──────► SessionRestorer ◄──────────────────┘
                     │
               (replays action log)
                     │
               EngineSession
```

### Key Modules

- **`packages/server/src/session/SessionPersistence.ts`** – Database operations for session storage. Handles save/load/delete/touch and 24-hour expiration cleanup. Uses JSON serialization for complex fields (action log, snapshot, registries, metadata).
- **`packages/server/src/session/SessionRestorer.ts`** – Recreates sessions from persistence by replaying the action log. Called lazily when `getSession()` finds a session in the database but not in memory.
- **`packages/server/src/session/SessionRecorder.ts`** – Records actions, phase advances, player name changes, and dev mode toggles to both the in-memory action log and database persistence.
- **`packages/server/migrations/002_create_session_snapshots.sql`** – Schema for the `session_snapshots` table with columns for creation options, action log, snapshot, registries, and metadata.

### Lifecycle

1. **Session Creation**: `SessionManager.createSession()` stores initial state in both memory and database
2. **Action Recording**: Transport handlers call `recordAction()`, `recordAdvance()`, etc. after each operation
3. **In-Memory Timeout**: After 15 minutes of inactivity, the in-memory session is purged
4. **Lazy Restore**: Next `getSession()` call triggers `SessionRestorer.restore()` which replays the action log
5. **24-Hour Cleanup**: `HourlyScheduler` calls `purgeExpiredFromPersistence()` to delete sessions older than 24 hours

### Testing

- **`tests/session/SessionPersistence.test.ts`** – Database operations: save/load round-trip, expiration, action appending
- **`tests/session/SessionRestorer.test.ts`** – Action log replay, player names, dev mode restoration
- **`tests/session/SessionRecorder.test.ts`** – Recording with and without persistence
