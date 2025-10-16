# Domain Boundaries

This document clarifies how the Web client, Engine runtime, and Content layer
collaborate inside Kingdom Builder. It focuses on responsibilities, sanctioned
data exchange, and the invariants that the engine relies on when executing the
game loop.

## Post-Migration Reference

The P1–P3 domain migration is complete and the detailed task journal now lives
in `docs/domain-migration/handover-log.md`. Refer to the following live
integration points when tracing current cross-domain behaviour:

- Metadata context loaders and selectors:
  `packages/web/src/contexts/RegistryMetadataContext.tsx` and companions.
- Protocol schemas and DTO exports: `packages/protocol/src/session/index.ts`
  (re-exported via `packages/protocol/src/index.ts`).
- HTTP session gateway client: `packages/server/src/client/HttpSessionGateway.ts`
  alongside its helper types.

## Responsibilities

### Content (`@kingdom-builder/contents`)

- Owns all player-facing data: actions, buildings, resources, phases, and
  balance numbers.
- Provides schema-validated definitions that other domains consume at runtime.
- Supplies registries, factories, and metadata so that simulations and UIs never
  hardcode resource names, identifiers, or numeric values.
- Maintains backward-compatible structures when evolving content so that the
  engine and web client can load new data without code changes.

### Engine (`@kingdom-builder/engine`)

- Interprets content definitions to advance the game state, enforce rules, and
  emit derived data (e.g., log entries, prompts, computed modifiers).
- Hosts mechanics such as triggers, evaluators, passives, and registries that
  resolve effects described in content.
- Exposes a pure, deterministic API that accepts content-driven inputs and
  returns serializable state updates for persistence or presentation.
- Guarantees that player-facing strings, icons, and lookup keys are surfaced
  exactly as supplied by the content package.

### Web (`@kingdom-builder/web`)

- Presents the current game state and affordances by consuming the engine API
  alongside content metadata.
- Maps engine identifiers to localized names, art, and layout supplied by the
  content layer.
- Captures user intent (e.g., chosen actions) and forwards it to the engine in
  terms of content-provided identifiers.
- Avoids embedding rule logic; instead, it renders controls based on the engine
  state and guidance exposed by content registries.

## Sanctioned Data Exchange

- **Content → Engine**: registries, definitions, schema guards, and helper
  utilities. The engine may import types or factories but must not mutate content
  definitions directly.
- **Content → Web**: presentation metadata, localized strings, iconography, and
  configuration required for UI rendering.
- **Engine ↔ Web**:
  - Web invokes engine APIs (`createGame`, `performAction`, evaluators, etc.)
    using identifiers sourced from content definitions.
  - Engine returns snapshots that include references to content IDs, derived
    numeric values, prompts, and log entries. The web client enriches the
    response using content metadata.
- **Engine ↔ Content (runtime)**: the engine may execute callbacks or evaluators
  registered by the content layer, provided they adhere to the schema contract
  and remain free of side effects outside the simulated state.
- **Persistence / Telemetry**: any stored game state uses engine-owned data
  structures that reference content IDs instead of denormalized copies of
  content definitions.

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
