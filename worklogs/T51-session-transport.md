# Resource Migration MVP - P2 - T51 - Session Transport Notes

- Cloned ResourceV2 registries (`resourcesV2`, `resourceGroupsV2`) through the local session gateway so every response mirrors the new catalog alongside the legacy registries.
- Verified engine session snapshots expose `valuesV2`/`resourceCatalogV2` on players and simulations, ensuring dev-mode toggles and phase simulations share the migrated payloads.
- Extended runtime tests to cover the ResourceV2 data flow and guard against mutation when registries and snapshots are re-used across requests.
