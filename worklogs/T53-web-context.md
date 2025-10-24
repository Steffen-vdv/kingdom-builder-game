# Resource Migration MVP - P2 - T53 - Web Translation Context ResourceV2 integration

- Extended the translation context to clone ResourceV2 catalogs, player value/bound maps, and expose metadata selectors alongside legacy registries.
- Added signed gain helpers layered on session snapshots so translation consumers can read positive/negative deltas without mutating the underlying log arrays.
- Updated tests and stubs to cover ResourceV2 catalog metadata, fallback descriptors, and the new selector surfaces while preserving existing legacy expectations.
