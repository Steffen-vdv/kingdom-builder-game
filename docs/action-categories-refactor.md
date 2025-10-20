# Action Categories - P1 - T1 - Content-Driven Refactor Plan

## Motivation

The current action category implementation is strongly coupled to hard-coded UI
groupings and duplicated across multiple layers. Transitioning categories to a
content-driven model lets the live game add, retire, or rename categories
without touching engine code. The refactor must:

- Align category metadata with the content pipeline so engine, server, and
  clients can react to registry changes automatically.
- Reduce cross-layer drift by defining a single canonical shape for category
  definitions.
- Preserve determinism so action ordering, layout, and translation behaviour
  remain stable after the migration.

### Goals

- Store all action category metadata in a shared content registry that publishes
  declarative definitions.
- Load categories dynamically in engine gateways, server cloning, and web
  clients.
- Standardize naming conventions (`categoryId` for references, `category` for
  objects) across the stack.
- Maintain deterministic ordering through explicit `order` fields and renderer
  layout identifiers.
- Provide documentation and test fixtures that make parity checks trivial for
  future contributors.

### Non-Goals

- Change the action composition or resolution rules themselves.
- Introduce new UI layouts beyond those enumerated below.
- Revisit localisation copy for action names or descriptions beyond ensuring
  translators receive the new metadata.
- Modify the action execution protocol payload structure outside category
  properties.

### Invariants to Preserve

- Actions must appear in the same order and layout groups as before when the
  default category set is loaded.
- Engine snapshots and deterministic logs must remain bit-for-bit identical for
  the default content package.
- Category identifiers must stay stable across server restarts and client
  reloads so existing save data resolves categories without migration.
- Automated tests that validate action availability, ordering, or rendering must
  continue to pass when pointed at the default definitions.

## Canonical `ActionCategoryDefinition`

Every content package exports action categories using the following shape:

```ts
interface ActionCategoryDefinition {
	/** Stable identifier used by protocols and registries (e.g., "basic"). */
	id: string;
	/** Player-facing label rendered in headings and tooltips. */
	title: string;
	/** Optional descriptive copy for detail panels. */
	description?: string;
	/** Icon asset key resolved by the UI icon atlas. */
	icon: string;
	/** Floating-point ordering value; lower numbers sort first. */
	order: number;
	/** Layout grouping resolved by UI renderers (see "Layout identifiers"). */
	layout: 'grid-primary' | 'grid-secondary' | 'list';
	/** Optional subtitle for compact layouts. */
	/** Falls back to `title` when omitted. */
	subtitle?: string;
	/** Optional flag to hide the category when empty (defaults to false). */
	hideWhenEmpty?: boolean;
	/** Optional analytics key override when telemetry diverges from `id`. */
	analyticsKey?: string;
}
```

### Layout identifiers

Every UI renderer that consumes categories must support the following layout
keys:

- `grid-primary` – primary action grid shown on the main turn UI.
- `grid-secondary` – auxiliary grid rendered for situational or phase-specific
  actions.
- `list` – vertically stacked list used in condensed dialogs and accessibility
  layouts.

Renderers should ignore unknown layout values gracefully, logging a warning and
defaulting to `list` so new layouts can roll out without breaking older
clients.

## Default category set

The baseline content package must continue to ship four categories with the
following metadata. Future refactors must validate parity against these values.

- **basic**
  - title: `Basic`
  - subtitle: `Core Commands`
  - description: Default castle commands available every turn.
  - icon: `icon-action-basic`
  - order: `0`
  - layout: `grid-primary`
  - hideWhenEmpty: `false`
- **hire**
  - title: `Hire`
  - subtitle: `Recruit Citizens`
  - description: Actions that add population or assign roles.
  - icon: `icon-action-hire`
  - order: `1`
  - layout: `grid-primary`
  - hideWhenEmpty: `false`
- **develop**
  - title: `Develop`
  - subtitle: `Improve Holdings`
  - description: Developments that upgrade existing buildings or lands.
  - icon: `icon-action-dev`
  - order: `2`
  - layout: `grid-secondary`
  - hideWhenEmpty: `false`
- **build**
  - title: `Build`
  - subtitle: `Expand Territory`
  - description: Construction options that add new structures or unlocks.
  - icon: `icon-action-build`
  - order: `3`
  - layout: `grid-secondary`
  - hideWhenEmpty: `false`

`analyticsKey` defaults to the category `id` for all baseline categories.

## Required implementation updates

### Content registries

- Introduce an `ACTION_CATEGORIES` registry exposing `ActionCategoryDefinition`
  entries and ensure content packages register their category lists during
  bootstrap.
- Accept either an array of definitions or a keyed map but normalize to an
  ordered array sorted by `order` with a stable `id` tiebreaker.
- Enforce `id` uniqueness at registration time and provide descriptive errors
  for duplicates.

### Protocol payloads

- Extend action payloads to include a `categoryId` string instead of an embedded
  category label.
- Update any payloads that previously included `category` objects to reference
  the canonical definition via `categoryId`.
- During the rollout window support both `category` and `categoryId`, mark
  `category` as deprecated, and remove it once all clients are updated.

### Server cloning & persistence

- Adjust session cloning and persistence routines to copy only the `categoryId`
  for actions. Resolve full category objects on demand via the content
  registry.
- Confirm that snapshot serialization leverages `categoryId` to avoid embedding
  redundant metadata.

### Engine gateways

- Update engine-side selectors and gateways that surface action metadata to
  fetch category definitions from the registry using the resolved `categoryId`.
- Cache lookups where necessary, but ensure caches invalidate when content
  registries reload.

### Web session registries

- Ensure the web client subscribes to the new category registry and requests
  definitions during session bootstrap.
- Convert any existing hard-coded category arrays to lookups sourced from the
  registry.
- Maintain `categoryId` naming for identifier fields and reserve `category` for
  hydrated objects pulled from the registry.

### Translation context

- Pass `categoryId` and hydrated `ActionCategoryDefinition` objects into
  translation layers so formatters can render titles, subtitles, and
  descriptions without duplicating metadata.
- Update translation caches and memoization keys to include `categoryId` and
  prevent stale strings after content updates.

### UI rendering

- Refactor category tabs, headers, and tooltips to rely on the canonical fields
  (`title`, `subtitle`, `icon`, `layout`).
- Respect the `hideWhenEmpty` flag when computing visible categories.
- Ensure layout containers branch on the `layout` key and gracefully handle
  unknown values by defaulting to the `list` template.

### Automated tests

- Update fixtures and factories (`createContentFactory`) to emit category
  definitions matching the canonical shape.
- Add regression tests that verify the default category ordering, layout
  distribution, and metadata parity with the list above.
- Include integration tests that confirm actions expose the expected
  `categoryId` in protocol payloads and that the web client renders titles from
  the registry.

### Naming conventions

- Use `categoryId` for every field storing a scalar identifier (protocol
  payloads, engine state, analytics events).
- Reserve `category` for hydrated `ActionCategoryDefinition` objects retrieved
  from registries.
- When mapping collections, prefer `categoriesById` or `categoryLookup` for
  dictionaries keyed by id, and `categoryList` for ordered arrays.

These updates must ship together so every layer reads from the same declarative
category definitions and downstream contributors have a stable contract to build
upon.
