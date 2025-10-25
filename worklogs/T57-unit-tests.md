# Resource Migration MVP - P2 - T57 - Unit test ResourceV2 migrations

- Replaced legacy resource transfer effect suites with ResourceV2 coverage that clamps donor/recipient deltas, respects rounding modes, and honours endpoint options using runtime catalogs built from the shared testing factories.
- Expanded ResourceV2 builder registry tests to rely on the testing factories for concise group/resource fixtures while continuing to assert parent metadata propagation and ordering semantics.
- Documented the refreshed coverage areas for ResourceV2 transfer behaviours and builder registry expectations.
