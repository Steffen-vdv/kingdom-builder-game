# Resource Migration MVP - P2 - T56 - Web tests ResourceV2 coverage

- Updated translation context coverage to seed ResourceV2 catalogs and metadata through testing factories, asserting selectors and signed-gain behavior without legacy snapshot noise.
- Refreshed ResourceBar scenarios to populate ResourceV2 values/bounds, exercising tier hovers and action/resource wiring against synthetic catalog data.
- Verified transport metadata responses expose ResourceV2 registries by extending the server integration test expectations.
- Removed brittle assertions tied to legacy stat/resource formatting in favor of focused checks that reflect the ResourceV2-driven UI.
