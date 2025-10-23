# Resource Migration MVP - P2 - T20 - Stat Resource Definitions

## Summary

- Migrated core stat metadata into ResourceV2 definitions, preserving legacy descriptions and percent display flags.
- Established baseline zero floor bounds for each stat to mirror existing non-negative behaviour expectations.

## Decisions

- **Lower bounds:** Set to `0` for all stat resources to preserve the legacy clamp-to-zero behaviour seen across stat consumers.
- **Percent formatting:** Enabled `displayAsPercent()` only for Absorption and Growth, matching the legacy `displayAsPercent` flags.

## Follow-ups

- Confirm whether future work should introduce explicit upper bounds (e.g., 100% caps) once reconciliation rules are finalised.
- Validate that downstream translators pick up the new ResourceV2 percent formatting without additional metadata mapping.
