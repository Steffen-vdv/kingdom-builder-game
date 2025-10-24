# T55 – Web Translation

## 2025-10-24

- Migrated diff logging helpers to consume ResourceV2 metadata/value snapshots and decorated metadata with legacy assets for consistent labels/icons.
- Routed session resource key plumbing through ResourceV2 ids (state extractors, tiered resource references, tests) and added fallback selectors for translation diff context.
- Rehomed ResourceV2 snapshot builders under the translation module for reuse across components and logging utilities.
