# Resource Migration MVP - P2 - T57 - Unit test refresh

- Updated content builder safeguard tests to assert ResourceV2 change payloads and transfer endpoints now emit reconciliation hooks and donor/recipient metadata instead of legacy amount-only params.
- Refactored engine ResourceV2 state suite to build runtime catalogs with the shared testing factories, exercising tier transitions, bound adjustments, and parent aggregation logic against the new helpers.
- Verified contents and engine ResourceV2 tests via Vitest to cover the refreshed cases (see command outputs in task transcript).
