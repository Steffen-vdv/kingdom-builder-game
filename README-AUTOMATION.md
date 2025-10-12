# Review Orchestration Automation

This repository includes two GitHub Actions workflows that coordinate code
reviews between CodeRabbit and Codex. The automation enforces a tight feedback
loop while preventing infinite review cycles.

## Workflow Overview

### `.github/workflows/pr-review-on-push.yml`

- **Trigger:** `push` events on any branch except `main` and `master`.
- **Debounce:** Waits two minutes before acting. Concurrency with
  `cancel-in-progress: true` guarantees that only the most recent push for a
  branch is processed, so rapid updates are batched together.
- **Behavior:**
  1. Detects open pull requests that use the pushed branch.
  2. Ensures the workflow labels (`under-review`, `awaiting-fixes`, and
     `max-iterations-reached`) exist.
  3. Removes the `awaiting-fixes` label.
  4. Adds the `under-review` label.
  5. Comments `@coderabbitai review` and `@codex review` to trigger both review
     bots.

### `.github/workflows/pr-review-orchestration.yml`

This workflow has two jobs.

1. **`initialize-metadata`** (runs on `pull_request` opened/reopened events)
   - Creates automation labels when needed.
   - Adds or resets the hidden iteration tracker comment
     (`<!-- REVIEW_ITERATION: 0 -->`) at the end of the PR description.
   - Clears automation labels when a PR is reopened, giving the workflow a clean
     slate.
2. **`process-review-comment`** (runs on new PR comments)
   - Listens for comments authored by `coderabbitai[bot]` that contain phrases
     such as “Actionable comments posted”.
   - Reads the iteration counter from the PR body and increments it (maximum of
     five automated cycles).
   - If the iteration count is below five:
     - Removes the `under-review` label.
     - Adds the `awaiting-fixes` label.
     - Posts `@codex fix` to request Codex fixes.
   - When the fifth iteration is reached:
     - Removes workflow labels and applies `max-iterations-reached`.
     - Posts a notification to `@Steffen-vdv` indicating that manual
       intervention is required.
   - All label and comment operations are idempotent and ignore errors when a
     label is missing.

Codex commits the resulting fixes, which trigger another push and restart the
cycle via the push workflow. Because iteration counts are capped at five, the
automation will stop looping if Codex and CodeRabbit cannot reach consensus.

## Required Labels

The workflows create missing labels automatically using the default colors and
meanings below. They can also be created manually if desired.

| Label                    | Color     | Description                                              |
| ------------------------ | --------- | -------------------------------------------------------- |
| `under-review`           | `#1d76db` | Pull request is actively being reviewed.                 |
| `awaiting-fixes`         | `#fbca04` | Actionable feedback exists and Codex should apply fixes. |
| `max-iterations-reached` | `#b60205` | Automation halted after five iterations.                 |

## Iteration Counter

- The counter lives in a hidden HTML comment at the end of the PR body:
  `<!-- REVIEW_ITERATION: 0 -->`.
- Each actionable CodeRabbit review increments the number.
- When the value reaches `5`, the workflow stops requesting Codex fixes and
  alerts the repository owner for manual follow-up.

### Manually Resetting the Counter

To reset automation manually:

1. Edit the PR description.
2. Replace the existing comment with `<!-- REVIEW_ITERATION: 0 -->`.
3. Optionally remove the `max-iterations-reached` label.
4. Push a new commit or comment `@coderabbitai review` to restart the cycle.

Reopening a closed PR also resets the iteration counter to zero and clears the
workflow labels automatically.

## Bot Safety & Idempotency

- The push workflow ignores commits made by `github-actions[bot]` to avoid
  feedback loops from workflow-generated commits.
- Label creation and deletion commands tolerate missing labels.
- The orchestration workflow only reacts to CodeRabbit comments, so manual
  reviewer commands remain unaffected.

## Initial Setup

No manual setup is required beyond merging these workflow files. After the first
run, labels will exist automatically and the automation will update PR bodies as
needed. Ensure the default repository permissions allow `GITHUB_TOKEN` to write
pull-request metadata (the standard configuration already does).
