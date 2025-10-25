# Resource Migration MVP - P2 - T57 - Unit test ResourceV2 alignment

- Refreshed ResourceV2 builder and transfer suites in `packages/contents/tests` to rely on the shared testing factories, adding coverage for reconciliation propagation, suppressHooks guards, and option sanitisation alongside the updated registry materialisers.
- Reworked ResourceV2 state and effect handler tests in `packages/engine/tests` to initialise runtime catalogs from the testing registries, exercising tier recalculation, parent aggregation, clamp-only reconciliation, and parent transfer rejections through the new helper APIs.
- Captured these test updates and outcomes in this log for downstream Resource Migration coordination.
