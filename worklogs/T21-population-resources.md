# Resource Migration MVP - P2 - T21 - Population Resource Definitions

## Summary

- Added ResourceV2 definitions for Council, Legion, and Fortifier using the legacy population role metadata for icons, labels, and descriptions.
- Introduced a Population resource group with a virtual parent that aggregates the role tracks for total staffing visibility.

## Decisions

- **Identifiers & ordering:** Chose the `resource:population:role:<role>` id pattern with sequential orders (1–3) so registries surface roles in the existing Council → Legion → Fortifier order.
- **Parent metadata:** Declared the virtual parent as `resource:population:total` with the label “Population” and icon `🧑‍🤝‍🧑`, keeping the description focused on the aggregate nature of the track for downstream UI copy.
- **Bounds:** Applied a zero lower bound to each role resource to preserve the non-negative population counts enforced by the legacy content builders.

## Follow-ups

- Confirm whether future tasks should add an explicit citizen/unassigned population resource or leave unassigned headcount inferred from max population minus staffed roles.
- Align group ordering conventions with upcoming resource collections (core, stats, etc.) once the overall registry structure solidifies.
