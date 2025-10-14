# Domain Migration - P1 - T1 - Cross-Domain Data Exchange Plan

This document captures the Domain Migration Phase 1 expectations for moving
registry, metadata, and content payloads between the Content, Engine, and Web
domains. Implementers should treat the following sections as canonical field
contracts until the dedicated migration specifications supersede them.

## Registry Descriptors

- **`registryId`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Stable identifier for the content registry imported into downstream
    domains.
- **`registryVersion`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Semantic version string matching the exported registry bundle.
- **`domain`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Enumerated origin domain; expected values are `content`, `engine`, or
    `web`.
- **`checksum`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Hash for validating integrity across transports.
- **`descriptorUri`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Path or URL pointing to the full registry descriptor payload.
- **`supportedTriggers`**
  - Required: No
  - Source: Engine snapshot
  - Notes: Array of trigger ids the registry expects the engine to implement.
- **`lastSyncEpoch`**
  - Required: No
  - Source: Transport
  - Notes: Unix epoch when the registry descriptor was last exchanged.

## Trigger Metadata

- **`triggerId`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Primary key that links to effects and evaluators.
- **`phase`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Game phase identifier in which the trigger fires.
- **`eventType`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Canonical event enum the engine listens for.
- **`payloadSchema`**
  - Required: **Yes**
  - Source: Engine snapshot
  - Notes: JSON schema describing the event payload transported across domains.
- **`defaultHandlers`**
  - Required: No
  - Source: Engine snapshot
  - Notes: Array of handler identifiers that should be registered by default.
- **`transportGuarantee`**
  - Required: No
  - Source: Transport
  - Notes: Delivery semantics enum: `at-most-once`, `at-least-once`, or
    `exactly-once`.

## Asset Descriptors

- **`assetId`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Unique asset identifier used across rendering, localization, and
    analytics.
- **`assetType`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Enumerated type such as `icon`, `illustration`, or `audio`.
- **`mediaUri`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Resolvable URI pointing to the asset file.
- **`checksum`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Hash for media integrity validation.
- **`dimensions`**
  - Required: No
  - Source: Content package
  - Notes: Object containing `width` and `height` in pixels when relevant.
- **`usageContexts`**
  - Required: No
  - Source: Engine snapshot
  - Notes: Array describing engine scenes or UI contexts consuming the asset.
- **`deliveryProfile`**
  - Required: No
  - Source: Transport
  - Notes: CDN or pipeline profile for serving the asset to clients.

## Overview Content Payload

- **`contentId`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Identifier for the primary content item being migrated.
- **`summary`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Localizable short-form text describing the content.
- **`details`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Rich text or markdown body for in-game presentation.
- **`tags`**
  - Required: No
  - Source: Content package
  - Notes: Array of taxonomy strings for filtering and search.
- **`defaultState`**
  - Required: No
  - Source: Engine snapshot
  - Notes: Serialized baseline state the engine applies when the content first
    loads.
- **`publishWindow`**
  - Required: No
  - Source: Transport
  - Notes: Object containing `startEpoch` and `endEpoch` for scheduled rollout.
- **`localizationMap`**
  - Required: No
  - Source: Transport
  - Notes: Map of locale codes to asset bundle ids populated during packaging.

## Identifier Aliases

- **`aliasId`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Alternate identifier exposed through historical or regional releases.
- **`primaryId`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Canonical identifier that the engine treats as source of truth.
- **`aliasType`**
  - Required: **Yes**
  - Source: Content package
  - Notes: Relationship enum: `legacy`, `regional`, or `external-system`.
- **`validFrom`**
  - Required: No
  - Source: Transport
  - Notes: Epoch when the alias becomes active in cross-domain exchanges.
- **`validTo`**
  - Required: No
  - Source: Transport
  - Notes: Epoch when the alias expires.
- **`syncNotes`**
  - Required: No
  - Source: Transport
  - Notes: Free-form string for annotating special handling requirements.

## Implementation Checklist

- **Protocol**
  - [ ] Implement serialization for all required fields listed above.
  - [ ] Enforce checksum validation during descriptor and asset transport.
  - [ ] Attach transport metadata (`lastSyncEpoch`, `transportGuarantee`,
        `publishWindow`, `deliveryProfile`) to outbound messages.
- **Server**
  - [ ] Persist registry, trigger, asset, and alias records with versioned
        history.
  - [ ] Validate incoming payloads against the documented required fields.
  - [ ] Surface synchronization timestamps for monitoring and rollback tooling.
- **Web**
  - [ ] Consume overview payloads and asset descriptors without assuming
        hardcoded identifiers.
  - [ ] Respect alias mappings when linking content in UI routes.
  - [ ] Display transport-driven scheduling (`publishWindow`) for admin
        dashboards.
