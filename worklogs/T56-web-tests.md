# Resource Migration MVP - P2 - T56 - Web tests ResourceV2 alignment

- Re-seeded translation context coverage with ResourceV2 catalog and group snapshots built from the shared testing factories, exercising metadata selectors, recent gain helpers, and catalog ordering through the new schema.
- Updated ResourceBar component tests to construct ResourceV2 value/bound snapshots via the factories, asserting hovercard titles, tier summaries, and button labels with catalog-driven formatting instead of legacy descriptors.
- Refreshed web log/resolution suites to expect icon-prefixed ResourceV2 summaries and stat labels, removing assertions tied to legacy-only formatting.
