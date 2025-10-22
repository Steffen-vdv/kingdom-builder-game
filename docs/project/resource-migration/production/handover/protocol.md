# Protocol Handover

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-22 18:45
- **Current Focus:** Resource Migration MVP protocol validators
- **State Summary:**
  - Added ResourceV2 definition, tier, and group schemas with clamp-only reconciliation and enforced limited parents.
  - Session contracts now expose ResourceV2 value maps, metadata descriptors, group registries, and the shared global action cost reference.
  - `validateGameConfig` now accepts optional ResourceV2 payloads alongside legacy config blocks for transition coverage.
- **Next Suggested Tasks:**
  - Wire engine/session consumers to read the limited parent flag set and block direct parent value mutations.
  - Update engine snapshot builders and web selectors to emit/consume the new `values` map and ResourceGroup metadata.
- **Risks / Blockers:**
  - Confirm downstream expectations for the limited parent flag set representation (Set vs. array) before engine integration.
