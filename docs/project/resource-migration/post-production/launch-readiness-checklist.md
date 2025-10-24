# Post-Production Checklist – Resource Migration

Use this document when the project approaches launch readiness. Complete every item before merging the final migration branch.

## Section A – Functional Tests

- [ ] All ResourceV2 definitions verified against design (bounds, reconciliation, tiering).
- [ ] ResourceGroup parent aggregation validated across engine, protocol, and UI.
- [ ] Global action costs enforced in simulation and reflected in UI.
- [ ] Tier transitions trigger correct enter/exit effects with no overlaps.
- [ ] Transfers respect reconciliation strategies and emit correct logging/breakdowns.

## Section B – Technical Cleanup

- [ ] Remove temporary guidance added to root `AGENTS.md` for the migration.
- [ ] Remove or resolve any TODO/DEPRECATED comments left during the migration.
- [ ] Delete legacy resource/stat/population builders and dead code paths.
- [ ] Confirm living documentation is archived or summarised in final architecture docs.
- [ ] Ensure tests reference ResourceV2 factories and registries exclusively.

## Section C – Regression Tests

- [ ] Run full automated test suite (`npm run check`) and address failures.
- [ ] Perform manual verification of critical player flows (action execution, phase transitions, population management).
- [ ] Validate UI translations/logging render correctly for representative resources.
- [ ] Confirm acceptable divergences (e.g., Market effect adjustments) are documented and approved.
- [ ] Review analytics/telemetry dashboards for ResourceV2 data consistency post-migration.

Record completion dates and responsible agents next to each checkbox during execution.
