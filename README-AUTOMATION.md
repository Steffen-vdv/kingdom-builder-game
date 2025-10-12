# Automation Playbook: CodeRabbit ↔ Codex Review Loop

This document explains the GitHub Actions workflows that coordinate CodeRabbit
reviews and Codex fixes for pull requests in this repository.

## Workflow Summary

Two workflows live under `.github/workflows/`:

- `pr-review-on-push.yml` waits for 15 seconds after pushes or `pull_request`
  synchronise events on branches backing open pull requests (excluding the
  initial branch creation push) and then:
  - removes the `awaiting-fixes` label when present,
  - ensures the `under-review` label is applied,
  - asks CodeRabbit and Codex to start a fresh review cycle.
    The workflow is skipped once the iteration counter reaches five.
- `pr-review-orchestration.yml` handles two jobs:
  - On pull request open or reopen it guarantees the PR body contains the hidden
    marker `<!-- REVIEW_ITERATION: 0 -->` and clears automation labels on
    reopen.
  - On completion of CodeRabbit check runs it detects actionable findings,
    increments the iteration counter when below five, and instructs Codex to
    apply fixes or finalises the pull request at the iteration cap.

## Iteration Tracking

- Each pull request carries a hidden HTML comment at the end of its description:
  `<!-- REVIEW_ITERATION: N -->`.
- `pr-review-orchestration.yml` keeps this marker in sync. The value is
  incremented only when CodeRabbit reports actionable findings and is capped at
  five to prevent loops.
- Once the counter reaches five the workflows switch the pull request to a
  terminal state by applying `max-iterations-reached`, removing other automation
  labels, and posting a summary for the repository owner.

## Labels

The automation relies on three labels. They are created on the fly when
missing:

- `under-review` (`#1d76db`): reviews in progress after a push.
- `awaiting-fixes` (`#fbca04`): CodeRabbit found actionable items and Codex
  must respond.
- `max-iterations-reached` (`#d93f0b`): safety stop triggered after five
  review/fix iterations.

## Initial Setup

1. Merge the workflows into `main`.
2. Ensure the repository has `GITHUB_TOKEN` permissions for `pull_request` and
   `issues` scopes (this is enabled by default for GitHub Actions).
3. No manual label creation is required—the workflows create them if absent.

## Operational Notes

- Workflows ignore pushes from automation accounts (`github-actions`, Codex,
  and CodeRabbit) to avoid loops.
- Rapid pushes are debounced via a 15 second sleep combined with workflow
  concurrency so that only the most recent commit triggers review comments.
- The push workflow also listens to `pull_request_target` `synchronize`
  events so updates from forked pull requests receive the same automated
  treatment.
- CodeRabbit actionable feedback is detected through its completed check runs,
  with inline review comments or summary metadata determining whether
  Codex is pinged for fixes.
- When a pull request is closed and later reopened the counter and labels reset.
- Manual comments such as `@coderabbitai review` or `@codex fix` are always
  allowed; they do not alter the iteration counter.

## Resetting the Iteration Counter Manually

1. Edit the pull request description.
2. Locate the hidden marker `<!-- REVIEW_ITERATION: N -->` at the bottom.
3. Replace `N` with the desired value (usually `0`).
4. Save the description. The next automation event will honour the updated
   value.

To clear the terminal state early, remove the `max-iterations-reached` label
and set the iteration marker to a number below five. The next push or
actionable CodeRabbit comment will resume the cycle.
