# Protocol Handover

- **Prepared by:** gpt-5-codex
- **Timestamp (UTC):** 2025-10-23 13:14
- **Current Focus:** Resource Migration MVP server transport contract
- **State Summary:**
  - Added ResourceV2 definition, tier, and group schemas with clamp-only reconciliation and enforced limited parents.
  - `validateGameConfig` now accepts optional ResourceV2 payloads alongside legacy config blocks for transition coverage.
  - Session contracts expose ResourceV2 value maps, ordered metadata, and registry payloads with group parents plus the global cost reference.
  - SessionManager and transports now emit ResourceV2 `values`, `resourceValues` registries (with global action cost), and `recentValueChanges` logs while omitting legacy resource/stat/population buckets.
  - Protocol tests cover duplicate tier guards, unsupported reconciliation, and parent mutation rejections.
- **Next Suggested Tasks:**
  - Update web adapters and REST gateways to consume `resourceValues`, `values`, and `recentValueChanges` payloads.
  - Follow up with engine to emit `recentValueChanges` directly so the server bridge no longer renames legacy gain logs.
- **Risks / Blockers:**
  - Downstream clients relying on legacy resource/stat fields must be updated before deploying the new contract.
