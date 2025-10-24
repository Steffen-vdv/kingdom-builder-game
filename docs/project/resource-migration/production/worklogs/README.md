# Resource Migration Production Worklogs

Individual task updates now live in this directory to avoid merge conflicts in the production living document. Follow these rules when adding a log entry:

## File naming

- Use the ticket/task identifier followed by a short slug: `TXX-<slug>.md` (for example, `T17-process-rework.md`).
- Keep slugs lowercase with hyphens; avoid spaces or underscores.

## Required sections

Every worklog file must be a short Markdown document with these headings:

1. `## Summary` – one or two bullet points describing the outcome.
2. `## Touched Files` – list repository paths that changed.
3. `## Tests` – enumerate commands that were executed and their results. Note skipped test suites explicitly (e.g., `_Not run – docs-only_`).
4. `## Follow-ups` – capture next steps, blockers, or handoff notes.

Include only information specific to the task; historical context stays in `production-living-docs.md`.

## Aggregation process

- After each task, contributors add their log file here and mention it in the "Latest Handover" section of the living doc.
- Periodically, the designated aggregator will summarize new log entries and merge the highlights back into the shared Work Log table in `production-living-docs.md`. When an entry has been captured, the aggregator should note the source filename to preserve traceability.
- Do **not** delete or rename worklog files once merged; they serve as the canonical audit trail.

This directory intentionally contains a placeholder file (see `.gitkeep`) so the folder remains in version control even before logs exist.
