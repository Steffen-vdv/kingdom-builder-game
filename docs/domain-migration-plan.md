# Domain Migration - P1 - T1 - Domain Migration Plan

## Target Frontend/Backend Separation

- **Frontend (Web)** consumes published APIs exposed by the backend to render
  UI, orchestrate client-side state, and surface user interactions.
- **Backend (Engine, Server, Protocol)** owns authoritative game state
  transitions, business rules, and multiplayer/session coordination. All client
  requests must route through these layers via versioned APIs.
- **Content** remains a shared domain but is published as immutable packages or
  registries that both frontend and backend load through stable interfaces.
- Communication across the boundary happens strictly through HTTP/WebSocket
  endpoints or other serialized protocol messages; no direct file system reads
  or module imports may cross the boundary.

## Current High-Level Coupling Pain Points

- UI components reach into engine helpers directly, creating brittle import
  chains that bypass API contracts and force simultaneous changes across
  domains.
- Shared utility modules leak presentation concerns into backend calculations,
  complicating testing and deployment pipelines.
- Content definitions occasionally reference frontend formatting logic,
  preventing independent versioning and rollback.
- Protocol schemas change without coordinated documentation, leaving consumers
  to guess message payloads and degrading reliability.

## Guiding Principles

1. **API-First Collaboration**: All cross-domain collaboration happens through
   documented APIs or protocol schemas. If functionality is needed across
   domains, expose it via an API rather than sharing internal modules.
2. **Immutable Contracts**: Version APIs, protocol schemas, and content
   registries so each domain can deploy independently. Breaking changes require
   migration notes in the handover log before rollout.
3. **Content Neutrality**: Treat content packages as data sources only.
   Business logic remains in Engine/Server, and presentation logic stays in Web.
   Content authors should not depend on runtime-specific behaviour.
4. **Separation of Concerns**: Enforce clear ownership boundaries. Web handles
   presentation and client orchestration; Engine processes rules; Server
   coordinates persistence and sessions; Protocol defines message contracts;
   Content supplies data.
5. **Observability and Documentation**: Every cross-domain touchpoint must
   include monitoring, tests, and reference docs so future iterations can verify
   compatibility quickly.

## Domain Responsibilities

- **Web**: Render UI, manage client-side state, compose content-driven visuals,
  and call backend APIs. Must never import Engine, Server, or Protocol
  implementation modules directly; relies solely on published API clients and
  generated protocol bindings.
- **Engine**: Implement deterministic game rules, simulations, and validation
  logic. Exposes functionality through backend services only and forbids
  importing Web or Content presentation helpers.
- **Content**: Provide structured, versioned data definitions for game entities,
  tuned to remain engine-agnostic. Content may define schemas but must not
  import Web, Engine, Protocol, or Server code.
- **Protocol**: Define serialized message schemas, transports, and version
  negotiation for communication between Web and Server. Protocol modules export
  generation artifacts (e.g., OpenAPI/Protobuf) but never import runtime logic
  from other domains.
- **Server**: Orchestrate sessions, persistence, and network endpoints. Imports
  Engine via stable service interfaces, loads Content via registries, and
  exposes Protocol-compliant APIs to Web. Must not import Web code or access
  Engine internals not exposed through its service contracts.

Cross-domain access is permitted only through explicit API clients, protocol
bindings, or content registry loaders. Direct cross-imports between these
domains are prohibited.

## Handover Log

Future contributors must record every migration step in this section whenever
they adjust domain boundaries or cross-domain touchpoints.

Each entry must include:

- **Date & Author**
- **Files Touched** (list every file and its domain)
- **Intent** (why the change was made and which principle it supports)
- **Communication Path Update** (describe new or altered API/protocol/content
  contracts)
- **Follow-Up Notes** (outstanding actions, monitoring, or documentation to
  complete)

Add new entries in reverse chronological order and ensure related tickets or
diagrams are linked where possible. Do not merge a change affecting domain
boundaries without updating this log.

<!-- Handover entries start below. Keep newest entries at the top. -->
