# Domain Migration – Phase 3 Session Coupling Overview

## Current Web ↔ Engine ↔ Server Coupling

The Web client currently orchestrates gameplay by standing up a local Engine session mirror and replaying remote responses inside the browser. Domain Migration - P3 - T9 retired the in-browser engine mirror; the remote session adapter now exposes the `LegacySession` surface by reading cached protocol snapshots from the session state store, mutating them for dev-mode toggles, and recording advance or simulation payloads without instantiating the engine locally.【F:packages/web/src/state/remoteSessionAdapter.ts†L1-L220】【F:packages/web/src/state/sessionStateStore.ts†L1-L200】

`sessionSdk.ts` wires the Web queue into the transport layer. Remote calls now hydrate the session state store and update the shared adapter rather than replaying an in-browser engine: `createSession` seeds the store, `fetchSnapshot` refreshes registries, `setSessionDevMode` toggles cached snapshot flags, `performSessionAction` awaits protocol responses, and `advanceSessionPhase` records advance payloads for UI helpers.【F:packages/web/src/state/sessionSdk.ts†L1-L340】 When transport errors occur (e.g., queue failures or missing registries), the SDK marks them as fatal so `GameContext` can tear the session down.

`GameContext.tsx` owns session lifecycle and serialises all mutations through a UI-level promise queue. It bootstraps sessions, manages abort controllers for refreshes, invokes `sessionSdk` helpers, and releases adapters when fatal errors occur or the component unmounts.【F:packages/web/src/state/GameContext.tsx†L1-L158】 Downstream hooks still depend on the legacy `LegacySession` surface, so protocol gaps are patched by interrogating cached snapshots through the adapter rather than querying the engine directly.

Because the backend session API only returns whole-session snapshots and registry dumps, several capabilities never cross the network. Costs, requirement breakdowns, action option enumerations, AI evaluation, and deterministic simulation tools are still reconstructed client-side through the adapter. The frontend therefore remains coupled to the `LegacySession` contract (enqueue, performAction, advancePhase, developer toggles) even though the engine is no longer embedded, so protocol expansion is required before those shims can disappear.

## Target Architecture: Protocol-Only Frontend Consumption

The goal is to eliminate the local engine mirror and rely exclusively on protocol responses. Achieving this requires new session protocol endpoints and a remote session store/adapter layer that hides transport details from UI hooks.

### Required Protocol Endpoints

- **Session bootstrap & lifecycle** – keep `createSession`, `fetchSnapshot`, `advancePhase`, `setDevMode`, but extend responses with deterministic snapshot hashes to enable idempotent caching.
- **Action catalogue endpoints** – provide action cost & requirement summaries, resolved options (including context-sensitive choices), and preflight requirement evaluation results so the UI can disable/annotate commands without simulating them locally.
- **Simulation endpoints** – expose read-only evaluation APIs for AI planners, hypothetical previews, and phase simulators (e.g., `/sessions/{id}/simulate` accepting batched actions or future-phase requests).
- **Developer tooling endpoints** – surface developer presets, registry diffs, and on-demand registry reloads so clients no longer read developer state from the mirror helpers.

### Remote Session Store & Adapter Responsibilities

A new adapter module should sit between transport and UI hooks. Its responsibilities:

- **Request queueing** – serialize remote mutations (action execution, phase advances) to preserve ordering guarantees currently provided by the local `EngineSession.enqueue` queue.
- **Snapshot caching** – maintain the most recent authoritative `SessionSnapshot` plus metadata hashes, exposing incremental diff helpers to reduce React churn.
- **Registry management** – cache registry payloads, expose derived helpers (resource keys, lookup tables), and publish invalidation events when the backend sends diffs instead of full dumps.
- **Developer preset handling** – apply developer presets by relaying backend-provided presets to the UI, replacing the in-browser developer bootstrap logic.
- **Failure handling** – centralise fatal-error detection and recovery (release caches, retry heuristics) so `GameContext` no longer needs to introspect engine-specific errors.

### UI Hook Expectations

UI hooks should no longer speak to `EngineSession` objects. Instead, they consume the adapter’s observable state:

- Hooks subscribe to snapshot slices (e.g., active player, resources) via the adapter’s caching layer.
- Action-invocation hooks enqueue remote operations through the adapter, awaiting protocol responses that include requirement/cost metadata for optimistic updates.
- Developer tooling hooks request presets and registry diagnostics from adapter utilities rather than recreating them locally.
- Testing hooks leverage the simulation endpoints through the adapter, allowing deterministic previews without invoking the engine directly.

## Handover Notes

Follow-up tasks must append a concise bullet list under this section summarising any behavioural changes they introduce. Keep entries chronological so future agents can review this document instead of tracing every pull request.

- Extended the HTTP session gateway to call the new REST endpoints for
  action costs, requirements, options, AI turn execution, and phase
  simulations so transport clients can consume the protocol-only
  surface without falling back to the local engine mirror.
- Routed the web GameProvider to feed remote session adapter snapshots
  through downstream hooks and legacy context bridges, ensuring
  compensation logging, AI runners, and action performers operate on
  the cached store data instead of engine-only session mirrors.
