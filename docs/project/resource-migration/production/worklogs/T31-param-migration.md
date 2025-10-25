# Resource Migration MVP - P2 - T31 - Param Migration Builders

## Summary

- Reworked the legacy `resourceParams`, `statParams`, and `transferParams` builders to wrap the ResourceV2 change and transfer helpers while preserving temporary legacy fields for engine compatibility.
- Threaded ResourceV2 identifier lookups through the resource and stat builders so every payload now carries the canonical `resourceId` alongside the existing key metadata.
- Documented outstanding follow-up needs (percent-from-stat behaviour and transfer donor/recipient defaults) for the ResourceV2 runtime integration.

## Touched Files

- packages/contents/src/config/builders/advancedEffectParams.ts
- packages/contents/src/config/builders/effectParams/resourceParams.ts
- packages/contents/src/config/builders/effectParams/statParams.ts
- packages/contents/src/resources.ts
- docs/project/resource-migration/production/worklogs/T31-param-migration.md

## Tests

- _Not run – parameter builder migration only_

## Follow-ups / Open Questions

- ResourceV2 stat percent-from-stat flows still depend on the legacy engine contract. Add explicit handling in the ResourceV2 add/remove effect before swapping the engine registry to the new payloads.
- Evaluate whether the transfer builder should expose full donor/recipient customisation (player scopes, write options) once downstream effects begin consuming the ResourceV2 payloads directly.
