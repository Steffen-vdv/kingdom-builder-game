# Protocol Handover

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-23 18:05
- **Current Focus:** Resource Migration MVP session payload contract
- **State Summary:**
  - Session contracts expose ResourceV2 value snapshots, metadata descriptors, and ordered group structures.
  - Registries/runtime config payloads now provide ResourceGroup definitions and the unified global action cost reference.
  - Protocol schemas/tests updated to remove legacy resources/stats/population fields in favour of the `values` map.
- **Next Suggested Tasks:**
  - Update server transport and web selectors to consume the new `values` contract and ResourceGroup descriptors.
  - Ensure engine snapshot builders populate tier status and global cost references for migrated resources.
- **Risks / Blockers:**
  - Downstream clients still depend on legacy `resources`/`stats` fields until their migrations land; coordinate cut-over sequencing.
