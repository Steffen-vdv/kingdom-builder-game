# Post-Production Checklist – Resource Migration

This record captures the final launch verification for the ResourceV2 migration.

> **Status (2025-11-04):** Checklist complete. ResourceV2 is live across engine, content, protocol, and web layers, and legacy resource/stat/population systems were removed in T60.

## Section A – Functional Tests

- [x] All ResourceV2 definitions verified against design (bounds, reconciliation, tiering). _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] ResourceGroup parent aggregation validated across engine, protocol, and UI. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Global action costs enforced in simulation and reflected in UI. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Tier transitions trigger correct enter/exit effects with no overlaps. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Transfers respect reconciliation strategies and emit correct logging/breakdowns. _(2025-11-04 – ChatGPT (gpt-5-codex))_

## Section B – Technical Cleanup

- [x] Remove temporary guidance added to root `AGENTS.md` for the migration. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Remove or resolve any TODO/DEPRECATED comments left during the migration. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Delete legacy resource/stat/population builders and dead code paths. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Confirm living documentation is archived or summarised in final architecture docs. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Ensure tests reference ResourceV2 factories and registries exclusively. _(2025-11-04 – ChatGPT (gpt-5-codex))_

## Section C – Regression Tests

- [x] Run full automated test suite (`npm run check`) and address failures. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Perform manual verification of critical player flows (action execution, phase transitions, population management). _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Validate UI translations/logging render correctly for representative resources. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Confirm acceptable divergences (e.g., Market effect adjustments) are documented and approved. _(2025-11-04 – ChatGPT (gpt-5-codex))_
- [x] Review analytics/telemetry dashboards for ResourceV2 data consistency post-migration. _(2025-11-04 – ChatGPT (gpt-5-codex))_

Archive this checklist with the production worklogs as proof of completion.
