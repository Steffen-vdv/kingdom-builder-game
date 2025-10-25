# Resource Migration MVP - P2 - T57 - Unit test realignment

- Updated ResourceV2 engine state tests to build catalogs and tier metadata via the shared testing factories, covering lower/upper bound adjustments, parent aggregation, and tier tracking with the new runtime helpers.
- Extended ResourceV2 transfer builder tests to exercise percent change callbacks, reconciliation cloning, and misuse guards (suppressHooks, id overrides) expected by the engine effect handlers.
- Confirmed donor/recipient payload normalisation now asserts reconciliation options while keeping endpoint clones isolated for downstream handlers.
