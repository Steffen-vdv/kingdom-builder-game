# Domain Boundaries

This document clarifies how the Content layer, shared Protocol package, Engine
runtime, Server transport, and Web client collaborate inside Kingdom Builder.
It focuses on responsibilities, sanctioned data exchange, and the invariants
that the engine relies on when executing the game loop. The system is split
between a backend (content, engine, protocol, and server) and a frontend (web),
and every boundary below reinforces that separation.

## Responsibilities

### Content (`@kingdom-builder/contents`)

- Owns all player-facing data: actions, buildings, resources, phases, and
  balance numbers.
- Provides schema-validated definitions that other domains consume at runtime.
- Supplies registries, factories, and metadata so that simulations and UIs never
  hardcode resource names, identifiers, or numeric values.
- Maintains backward-compatible structures when evolving content so that the
  engine and web client can load new data without code changes.

### Protocol (`@kingdom-builder/protocol`)

- Publishes the canonical TypeScript types and zod schemas that describe
  session state, transport payloads, and DTOs shared across packages.
- Provides stable serialization contracts for HTTP and in-memory calls so the
  server and web client can rely on identical shapes.
- Maintains semver discipline; any breaking change requires synchronous
  updates across engine, server, and web packages.

### Engine (`@kingdom-builder/engine`)

- Interprets content definitions to advance the game state, enforce rules, and
  emit derived data (e.g., log entries, prompts, computed modifiers).
- Hosts mechanics such as triggers, evaluators, passives, and registries that
  resolve effects described in content.
- Exposes a pure, deterministic API that accepts content-driven inputs and
  returns serializable state updates for persistence or presentation.
- Guarantees that player-facing strings, icons, and lookup keys are surfaced
  exactly as supplied by the content package.

### Server (`@kingdom-builder/server`)

- Hosts backend session management, authentication, and HTTP transport around
  the engine runtime.
- Bootstraps engine instances with loaded registries, applies request-scoped
  overrides, and handles caching between calls.
- Exposes REST endpoints (see **Transport & API Surface** below) that accept
  and return protocol-defined payloads.
- Enforces authentication/authorization and request validation before invoking
  engine operations.

### Web (`@kingdom-builder/web`)

- Presents the current game state and affordances by consuming the engine API
  alongside content metadata.
- Maps engine identifiers to localized names, art, and layout supplied by the
  content layer.
- Captures user intent (e.g., chosen actions) and forwards it to the engine in
  terms of content-provided identifiers.
- Avoids embedding rule logic; instead, it renders controls based on the engine
  state and guidance exposed by content registries.
- Communicates exclusively with the server's HTTP API rather than linking
  directly against the engine, preserving frontend/backend isolation.

## Sanctioned Data Exchange

- **Content → Engine**: registries, definitions, schema guards, and helper
  utilities. The engine may import types or factories but must not mutate content
  definitions directly.
- **Content → Web**: presentation metadata, localized strings, iconography, and
  configuration required for UI rendering.
- **Protocol ↔ All domains**: shared request/response schemas and DTO exports.
  Consumers treat these as immutable contracts when serializing data across
  process boundaries.
- **Server ↔ Engine**:
  - Server invokes engine APIs (`createGame`, `performAction`, evaluators,
    etc.) using identifiers sourced from content definitions or inbound
    requests.
  - Engine returns snapshots that include references to content IDs, derived
    numeric values, prompts, and log entries. The server serializes the
    response using protocol types.
- **Web ↔ Server**:
  - Web sends HTTP requests defined in **Transport & API Surface**, providing
    user intent exclusively through protocol payloads.
  - Server responses supply snapshots and metadata that the web client enriches
    with content registries for presentation.
- **Engine ↔ Content (runtime)**: the engine may execute callbacks or evaluators
  registered by the content layer, provided they adhere to the schema contract
  and remain free of side effects outside the simulated state.
- **Persistence / Telemetry**: any stored game state uses engine-owned data
  structures that reference content IDs instead of denormalized copies of
  content definitions.

## Transport & API Surface

The Fastify transport exposes REST endpoints under `/sessions` for the web
client and tooling. All requests and responses use `@kingdom-builder/protocol`
types, and callers must provide authentication headers recognized by the server
middleware.

- `POST /sessions`: create a new session from configuration and content IDs.
- `GET /sessions/:id/snapshot`: fetch the latest serialized game snapshot.
- `POST /sessions/:id/advance`: advance the session through queued phases.
- `POST /sessions/:id/actions`: perform a player action with supplied
  parameters.
- `POST /sessions/:id/actions/:actionId/costs`: calculate the dynamic resource
  cost for an action.
- `POST /sessions/:id/actions/:actionId/requirements`: evaluate whether an
  action is currently legal and list failure reasons.
- `GET /sessions/:id/actions/:actionId/options`: retrieve dynamic parameter
  options (targets, resources, etc.).
- `POST /sessions/:id/ai-turn`: run the AI controller for the specified
  session.
- `POST /sessions/:id/simulate`: simulate upcoming phases without mutating
  persistent state.
- `POST /sessions/:id/dev-mode`: toggle developer tooling (e.g., skip rules).
- `PATCH /sessions/:id/player`: update player metadata such as display names.

Clients may also use derived transports (e.g., SDK wrappers) that delegate to
these endpoints. All custom transports must honour authentication, logging, and
error semantics defined by the server package.

## Engine Invariants

The engine assumes the following guarantees from other domains:

1. **Schema compliance**: content definitions satisfy the published zod schemas
   and do not omit required hooks (e.g., triggers, effect handlers).
2. **Pure callbacks**: content evaluators and passives do not rely on mutable
   singletons or perform external I/O; they operate solely on supplied context
   and state arguments.
3. **Stable identifiers**: content IDs referenced in persisted games remain
   available across releases. Deprecations must provide forward-compatible
   aliases or migrations.
4. **Read-only imports**: neither web nor content code mutates engine exports.
   Similarly, the engine treats imported content as immutable data.
5. **Deterministic inputs**: the web client forwards player intent using engine
   request types without augmenting them with additional derived state.
6. **Version parity**: all three packages are upgraded together so that shared
   types remain in sync and runtime type mismatches cannot occur.

Violating these expectations can surface as runtime assertion failures, invalid
state transitions, or UI desynchronization. Each domain should validate inputs
against the contracts above before releasing new features.
