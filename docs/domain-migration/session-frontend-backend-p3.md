# Domain Migration - P3 - T1 - Session frontend/backend protocol alignment

## Current coupling inventory

### Web client dependencies

- `packages/web/src/game/GameContext.tsx` centralizes session state by combining
  UI context, the engine mirror, and direct API calls. It owns loading,
  mutation, and optimistic updates rather than delegating to a protocol-aware
  adapter, so components access shared mutable state instead of declarative
  responses.
- `packages/web/src/session/legacySessionMirror.ts` reproduces engine lifecycle
  logic inside the browser. It consumes server snapshots and then replays them
  locally to derive projections, which means the client depends on engine
  internals, timing hooks, and queue semantics that should live on the server.
- `packages/web/src/session/sessionSdk.ts` mixes HTTP calls with mirror
  orchestration. It shapes responses to match `legacySessionMirror.ts` instead of
  the true protocol, hides pending request queues, and duplicates validation that
  should live with the API surface.

### Server API gaps

- The API currently exposes session creation, basic player actions, and
  snapshot streaming, but the web client still calculates or guesses several
  derived data sets.
- Costs: the client recomputes action costs because no endpoint exposes the
  server-evaluated resource deltas per action.
- Requirements: preconditions are checked inside the mirror, with only boolean
  success/failure returned from the API.
- Options: the client resolves option lists (targets, action variants) by
  running mirror evaluators.
- AI decisions: simulations and AI previews are unavailable because the API does
  not publish planners or forecast endpoints.
- Simulation: the UI cannot request deterministic simulations (phases, future
  triggers) without invoking mirror helpers.

## Target protocol-driven architecture

### Protocol endpoints

- `GET /session/:sessionId/snapshot` → canonical snapshot payload and metadata
  describing version, phase, and action log cursor.
- `GET /session/:sessionId/options` → server-authoritative action catalog with
  costs, requirements, and target selectors resolved for the active player.
- `POST /session/:sessionId/actions` → enqueue player actions and return the
  resulting protocol events (queued, accepted, rejected) plus the new snapshot
  cursor.
- `GET /session/:sessionId/simulations` → deterministic simulation previews for
  developer tooling and AI, parameterized by triggers or future turns.
- `POST /session/:sessionId/presets` → apply preset content or developer
  overrides when bootstrapping sessions.
- `GET /session/:sessionId/ai-recommendations` → expose planner output for AI or
  coaching overlays.

### Remote session store and adapter responsibilities

- Queueing: the adapter holds a per-session action queue, ensures sequencing via
  optimistic IDs, and reconciles server acknowledgements before updating React
  state.
- Snapshot caching: maintain the latest confirmed snapshot plus a history
  limited by retention policy, exposing helpers for diffing and time travel.
- Registries: register content translators, effect renderers, and protocol
  formatters so consumers subscribe to derived views without accessing the
  engine mirror directly.
- Developer presets: expose helpers for loading, applying, and persisting preset
  seeds so QA can configure sessions through the adapter instead of custom
  scripts.
- Error handling: translate protocol errors into typed results (retryable,
  authorization, validation) and broadcast them through adapter events.

### UI hook integration expectations

- Hooks such as `useSession`, `useActionOptions`, and `useSimulationPreview`
  depend solely on the adapter API: subscribe to observable stores or call typed
  async functions that return protocol responses.
- Components never import `legacySessionMirror.ts` or manual HTTP clients.
  Instead, they access adapter-bound hooks which encapsulate queueing,
  optimistic updates, and caching policies.
- Testing utilities mock the adapter interface rather than engine mirrors so UI
  tests assert protocol usage, not engine internals.

## Handover notes

Append a new bullet under this section for every follow-up task. Each bullet
must summarize the behavioural change introduced (one sentence), the impacted
components, and the protocol endpoints touched, if any. Future agents will rely
on this log instead of cross-task coordination threads.
