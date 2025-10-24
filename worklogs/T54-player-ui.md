# Resource Migration MVP - P2 - T54 - Player HUD ResourceV2 migration

- Updated the player resource bar to render ResourceV2 metadata/value snapshots, including tier-track hover details sourced from catalog definitions.
- Migrated stat and population displays to ResourceV2, reusing formatter helpers for hovercards and change badges while deriving legacy mappings through metadata resolvers.
- Added shared display helpers for ResourceV2 buckets to keep resource, stat, and population summaries aligned across the HUD components.
- Repointed HUD resource/stat/population components to the typed `translation/resourceV2` exports, tightened snapshot bounds/forecast handling, and ensured hovercards/log badges reflect signed ResourceV2 gains.
- Verification: `npm run lint` (pass), `npm run check` (fails: known `developmentTarget` regression in contents).
