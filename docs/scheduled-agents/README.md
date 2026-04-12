# Scheduled Code Health Agents

Seven daily autonomous agents, each spawned as a Claude Code scheduled task
with its own branch. Every agent finds problems in its domain, fixes them,
optionally updates docs to prevent recurrence, then commits and pushes.

**If an agent cannot find anything meaningful to fix, it must NOT push and
should instead output a brief report stating the codebase is clean for its
domain. This signals the scheduled task may need to be paused or its prompt
replaced.**

## Agents

| #   | Agent                              | Domain                         |
| --- | ---------------------------------- | ------------------------------ |
| 1   | Golden Rule Auditor                | CLAUDE.md rule violations      |
| 2   | Technical Debt Tracker             | Deprecated/legacy/stale code   |
| 3   | Architecture Drift Detector        | Layer violations, doc drift    |
| 4   | Bug Finder & Fixer                 | Logic bugs across all packages |
| 5   | UI/UX Improvement Agent            | Web visual quality & polish    |
| 6   | Refactor Agent                     | Structural quality (SOLID)     |
| 7   | Feature Visualization Gap Detector | Content/Engine vs Web parity   |
