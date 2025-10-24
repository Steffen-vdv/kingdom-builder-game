# Resource Migration MVP - P2 - T51 - Session Transport Wiring

- Extended engine and server session gateways to mirror ResourceV2 registries alongside legacy registry maps so all lifecycle responses deliver the new catalog data.
- Hydrated player snapshots and simulation payloads with `valuesV2`/`resourceBoundsV2`, ensuring dev-mode snapshot routes, AI turns, and simulations expose the same ResourceV2 payloads as primary session responses.
- Centralised ResourceV2 serialization helpers in the session asset builder so runtime config snapshots, metadata dumps, and per-session registries stay synchronised with the content catalog.
