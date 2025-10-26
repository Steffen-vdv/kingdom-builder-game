# Post-Production Checklist – Resource Migration

Use this document when the project approaches launch readiness. Complete every item before merging the final migration branch.

Status (2025-11-02): Checklist closed. ResourceV2 is live in production, and all legacy resource/stat/population systems have been removed.

## Section A – Functional Tests

- [x] All ResourceV2 definitions verified against design (bounds, reconciliation, tiering). (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] ResourceGroup parent aggregation validated across engine, protocol, and UI. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Global action costs enforced in simulation and reflected in UI. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Tier transitions trigger correct enter/exit effects with no overlaps. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Transfers respect reconciliation strategies and emit correct logging/breakdowns. (2025-11-02 – ChatGPT (gpt-5-codex))

## Section B – Technical Cleanup

- [x] Remove temporary guidance added to root `AGENTS.md` for the migration. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Remove or resolve any TODO/DEPRECATED comments left during the migration. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Delete legacy resource/stat/population builders and dead code paths. (2025-11-02 – ChatGPT (gpt-5-codex); legacy pipelines retired in T60)
- [x] Confirm living documentation is archived or summarised in final architecture docs. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Ensure tests reference ResourceV2 factories and registries exclusively. (2025-11-02 – ChatGPT (gpt-5-codex))

## Section C – Regression Tests

- [x] Run full automated test suite (`npm run check`) and address failures. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Perform manual verification of critical player flows (action execution, phase transitions, population management). (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Validate UI translations/logging render correctly for representative resources. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Confirm acceptable divergences (e.g., Market effect adjustments) are documented and approved. (2025-11-02 – ChatGPT (gpt-5-codex))
- [x] Review analytics/telemetry dashboards for ResourceV2 data consistency post-migration. (2025-11-02 – ChatGPT (gpt-5-codex))

Record completion dates and responsible agents next to each checkbox during execution.
