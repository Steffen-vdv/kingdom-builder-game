# Resource Migration MVP - P2 - T56 - Web test suites ResourceV2 migration

- Updated translation, component, and integration web tests to seed ResourceV2
  catalogs/values via shared fixtures, replacing legacy resource/stat
  assumptions and aligning expectations with the hover-card driven UI.
- Added reusable helpers (`createResourceV2CatalogFixture`, session cloning
  utilities, scaffold updates) so snapshot builders and test scaffolds
  propagate ResourceV2 metadata/values consistently.
- Adjusted assertions to drop legacy formatting checks and verified lint/type/
  test pipelines, noting coverage gaps for future integration tests that
  exercise server-provided ResourceV2 data.
