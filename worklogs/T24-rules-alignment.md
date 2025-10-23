# Resource Migration MVP - P2 - T24 - Rules Alignment

## Summary

- Sourced the happiness rule definitions from the ResourceV2 catalog, wiring tier passives to carry the tier track metadata and ResourceV2 id alongside the existing legacy key exports for downstream compatibility.
- Expanded the shared tier summary store to index happiness tiers by both the legacy key and the new tier track metadata id, enabling future consumers to resolve summaries via ResourceV2 identifiers without losing current behaviour.
- Pointed the primary content icon to the ResourceV2 castle HP identifier with validation against the catalog so designers can rely on the new id scheme while keeping legacy fallbacks documented.

## Decisions

- Preserved the legacy `tieredResourceKey` value in `RULES` to avoid breaking engine consumers while attaching the ResourceV2 id and tier track metadata as supplemental fields for the migration.
- Embedded tier track metadata and the ResourceV2 id directly in the happiness passive metadata rather than extending the builder helpers so downstream services can experiment without touching the legacy APIs yet.

## Follow-ups

- Update the session resource registry builder to expose ResourceV2 ids (at least as aliases) so the primary icon lookup resolves without falling back to gold in the web client.
- Audit engine/web consumers that read `RULES.tieredResourceKey` to ensure they eventually switch to the new `tieredResourceId` once the runtime data pipeline supports it.
