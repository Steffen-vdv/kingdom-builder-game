# Protocol Work Log

> Append a dated entry at the bottom after completing protocol or API tasks. Note schema adjustments, compatibility decisions, and any integration follow-ups.

| Date       | Agent       | Summary                                                                                                      | Follow-up / Links                                                                              |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 2025-10-22 | gpt-5-codex | Added ResourceV2 schema validation with clamp-only enforcement and optional config wiring.                   | Validate engine handling for limited parent flag set exposure.                                 |
| 2025-10-22 | gpt-5-codex | Replaced legacy resource/stat/population payloads with ResourceV2 values and registries.                     | Align engine/web session adapters with ResourceV2 snapshots.                                   |
| 2025-10-23 | gpt-5-codex | Server transport now serializes ResourceV2 `values`, registries, and recent change logs in session payloads. | Notify web consumers about `recentValueChanges` rename and `resourceValues` registry contract. |
