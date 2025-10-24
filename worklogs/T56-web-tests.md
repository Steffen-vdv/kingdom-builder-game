# Resource Migration MVP - P2 - T56 - Web tests ResourceV2 alignment

- Updated web translation/component/integration suites to seed ResourceV2 catalogs and values with the shared testing factories so coverage reflects the ResourceV2-driven UI contracts instead of legacy resource keys.
- Replaced brittle legacy format snapshots with targeted assertions that validate ResourceV2 metadata selectors, signed gains, and translation context wiring while keeping action/asset coverage intact.
- Documented the integration harness change that now boots Fastify sessions with a synthetic ResourceV2 catalog to preserve HTTP surface coverage during the migration.
