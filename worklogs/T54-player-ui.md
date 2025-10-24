# Resource Migration MVP - P2 - T54 - Player UI ResourceV2 migration

- Reworked the player resource and stat panels to source values from ResourceV2 metadata snapshots, unifying hovercards and signed-change displays through the new formatter helpers.
- Updated population summaries to draw from ResourceV2 group definitions, surfacing total staffing and role tooltips with signed gain context.
- Added shared ResourceV2 snapshot utilities to translate legacy forecast buckets and metadata into web-friendly value snapshots.
- Normalized ResourceV2 snapshot construction to avoid mutating readonly fields, tightened PopulationInfo snapshot context handling, and ensured ResourceButton treats null forecasts as optional values.
