# Scheduled Code Health Agents

Six daily autonomous agents, each spawned as a Claude Code scheduled task
with its own branch. Every agent finds problems in its domain, fixes them,
optionally updates docs to prevent recurrence, then commits and pushes.

## Agents

| #   | Agent                       | Domain                         | Action           |
| --- | --------------------------- | ------------------------------ | ---------------- |
| 1   | Golden Rule Auditor         | CLAUDE.md rule violations      | Fix code         |
| 2   | Technical Debt Tracker      | Deprecated/legacy code         | Remove dead code |
| 3   | Architecture Drift Detector | Layer violations, doc drift    | Fix code + docs  |
| 4   | Bug Finder & Fixer          | Logic bugs across all packages | Fix bugs         |
| 5   | UI/UX Improvement Agent     | Web visual quality & polish    | Improve UI       |
| 6   | Refactor Agent              | Structural quality (SOLID)     | Refactor code    |

## Common Rules

All agents share these behaviors:

- **Read CLAUDE.md first** — it is the operating manual
- **Fix, don't report** — every agent commits fixes, not reports
- **Verify before pushing** — run `pnpm run check` before push; revert on failure
- **Teach future agents** — when a fix reveals a pattern, update the relevant
  doc (CLAUDE.md, architecture-reference.md, domain-boundaries.md, etc.)
  with a small addition (~1-3 lines) so future sessions avoid the same mistake
- **Commit per change** — use judgment on whether to bundle or separate commits
- **Stay in your branch** — never push to main
