# Resource Migration MVP - P2 - T52 - Integration Test Updates

- Updated integration fixtures to bootstrap the runtime ResourceV2 catalog and expose delta maps for `valuesV2`, keeping helper utilities aligned with engine bootstrap requirements.
- Refreshed action/building flow tests (effect groups, placement, stat bonuses, edge cases, random turns) to assert both legacy mirrors and ResourceV2 value maps, preventing regressions while legacy payloads remain.
- Ensured session-based tests (dev mode presets, royal decree, translation harnesses) verify ResourceV2 catalog metadata, player value maps, and mirrored descriptors for downstream UI coverage.
- Documented ResourceV2 metadata propagation for translation providers so synthetic registry contexts populate `resourcesV2` alongside legacy descriptors during log rendering.
