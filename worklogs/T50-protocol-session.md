# Resource Migration MVP - P2 - T50 - Protocol Session Updates

- Promoted `valuesV2` and `resourceBoundsV2` to required fields in session player snapshots so protocol contracts mirror the engine payloads.
- Documented `resourceCatalogV2` as an always-on snapshot payload and clarified how ResourceV2 metadata/group mirrors behave for legacy sessions.
- Updated registry/runtime config contracts to highlight the first-class ResourceV2 group exports while noting compatibility expectations for pre-migration transports.
