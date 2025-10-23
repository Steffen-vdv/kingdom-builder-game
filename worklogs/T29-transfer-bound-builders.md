# Resource Migration MVP - P2 - T29 - Transfer & Bound Builders

## Summary

- Added `transferEndpoint(resourceId)` helper with chainable player/change/reconciliation/options setters that mirror the engine payload for donor/recipient configurations.
- Added `resourceTransfer()` builder to compose donor/recipient payloads into effect params and `increaseUpperBound(resourceId)` helper enforcing positive integer deltas.
- Exported new builders and payload types through `@kingdom-builder/contents/resourceV2` for downstream content modules and wrote unit tests covering happy paths and guardrails.

## Validation Gaps

- Transfer builders currently copy reconciliation and options fields but do not ensure donor/recipient changes request opposite signs; the engine performs this validation at runtime.
- Hook suppression remains unsupported for transfers and will continue throwing until the engine wires the flag.
- Options toggles only support boolean flags; future MVP scope might require numeric or string metadata, which would need follow-up adjustments.
