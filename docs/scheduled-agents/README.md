# Scheduled Code Health Agents

Three daily scheduled tasks, each containing 2-3 missions. Every mission finds
problems in its domain, fixes them, optionally updates docs to prevent
recurrence, then commits.

**If an agent cannot find anything meaningful to fix across ANY of its missions,
it must NOT push and should instead output a brief report stating the codebase
is clean. This signals the scheduled task may need to be paused or its prompt
replaced.**

## Tasks

| Task  | Missions                                           | Focus                                 |
| ----- | -------------------------------------------------- | ------------------------------------- |
| **A** | Bug Finder, Feature Visualization Gap              | Deep full-stack reasoning (2 hardest) |
| **B** | Golden Rule Auditor, Tech Debt, Architecture Drift | Code health & standards enforcement   |
| **C** | UI/UX Improvement, Refactor, Product Explorer      | Polish, structure & PO visibility     |
