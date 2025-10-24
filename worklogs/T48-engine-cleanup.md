# Resource Migration MVP - P2 - T48 - Engine Cleanup Summary

- Normalised legacy resource/stat/population reads to use ResourceV2 identifiers and helpers across engine snapshots, logging, developer presets, and trigger collection.
- Updated legacy resource-manipulation effects (add/remove/transfer) to write through ResourceV2 state when available while keeping safe fallbacks for pre-migration scenarios.
- Simplified player cloning and population utilities to pull values through ResourceV2 mappings, eliminating direct access to legacy `player.resources`, `player.stats`, and `player.population` objects.
