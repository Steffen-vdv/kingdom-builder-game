# Resource Migration MVP - P2 - T57 - Unit tests ResourceV2 alignment

- Shifted engine ResourceV2 state tests onto the shared testing factories, exercising tier recalculation, parent aggregation, and bound adjustments against runtime catalogs derived from content builders.
- Expanded transfer builder suites to cover change callbacks, option normalisation, and suppressHooks guardrails, matching the runtime handler expectations for tier skipping and reconciliation defaults.
- Kept regression coverage on bound adjustments through the upper-bound builder checks, ensuring deltas enforce positivity while still accepting player targeting overrides.
