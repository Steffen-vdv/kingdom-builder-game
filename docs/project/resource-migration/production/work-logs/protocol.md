# Protocol Work Log

> Append a dated entry at the bottom after completing protocol or API tasks. Note schema adjustments, compatibility decisions, and any integration follow-ups.

| Date       | Agent       | Summary                                                                                                                     | Follow-up / Links                                                                                     |
| ---------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2025-10-22 | gpt-5-codex | Added ResourceV2 schema validation with clamp-only enforcement and optional config wiring.                                  | Validate engine handling for limited parent flag set exposure.                                        |
| 2025-10-22 | gpt-5-codex | Replaced legacy resource/stat/population payloads with ResourceV2 values and registries.                                    | Align engine/web session adapters with ResourceV2 snapshots.                                          |
| 2025-10-22 | gpt-5-codex | Server SessionManager/transport now ship ResourceV2 registries, metadata values, recent change logs, and global cost hints. | Confirm engine snapshot rename to `recentValueChanges` is stable and coordinate web client ingestion. |
