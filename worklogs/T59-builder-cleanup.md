# Resource Migration MVP - P2 - T59 - Builder cleanup

## Summary

- Retired the legacy `resourceParams`, `statParams`, and `transferParams` builders from the content config layer in favour of the ResourceV2 helpers.
- Added ResourceV2 transfer helpers and migrated basic and hire actions to the new change builders.
- Removed obsolete validation coverage and refreshed docs to describe the updated helper usage.

## Notes

- Engine handlers still consume the legacy `key`/`amount` properties, so the new helpers continue to emit them alongside the ResourceV2 payload.
- Additional cleanup is required in engine tests once the `allowShortfall` flag is formally retired.

## Follow-ups

- Update the production living document to reference the new helper modules after downstream validation.
- Confirm downstream content packages no longer import the removed builders before deleting historical migration references.
