# Resource Migration MVP - P2 - T18 - Core Resource Definitions

## Summary

- Drafted initial ResourceV2 definitions for gold, action points, and castle HP using existing metadata and baseline clamp-to-zero bounds.
- Captured outstanding alignment questions around identifier naming, ordering, and gold debt expectations for follow-up review.

## Touched Files

- packages/contents/src/resourceV2/definitions/coreResources.ts
- packages/contents/src/resourceV2/definitions/index.ts
- docs/project/resource-migration/production/worklogs/T18-core-resource-defs.md

## Tests

- _Not run – content definitions only._

## Follow-ups

- Confirm whether gold should support negative balances (bankruptcy tiers) or remain clamped at zero in the MVP definitions.
- Validate the canonical ResourceV2 identifier scheme (`resource:core:<slug>`) before other migrations rely on it.
- Establish intended ordering for core resources once aggregation wiring begins so array sequencing matches UI expectations.
