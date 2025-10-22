# Protocol Handover

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-23 15:12
- **Current Focus:** Resource Migration MVP session contract migration
- **State Summary:**
  - Session payloads now expose a unified `values` map plus ResourceV2 metadata (descriptors, groups, tier status, ordered blocks).
  - Registry and runtime config responses include ResourceGroup definitions and the single global action cost resource id.
  - Protocol schemas and tests verify the new ResourceV2 surfaces, removing legacy resource/stat/population fields.
- **Next Suggested Tasks:**
  - Update engine/session snapshot builders to populate `values`, `valueHistory`, and `valueSources` while dropping legacy maps.
  - Coordinate web selectors/fixtures to read the ResourceV2 metadata payloads and recent value change contract.
- **Risks / Blockers:**
  - Downstream packages still compile against legacy fields; expect breaking changes until engine/web migrations land.
