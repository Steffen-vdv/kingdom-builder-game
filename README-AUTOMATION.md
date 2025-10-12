# Kingdom Builder Automation Workflows

This repository now includes a two-part GitHub Actions automation layer that
coordinates CodeRabbit (reviewer) and Codex (fixer) during pull request
iterations. The automation targets existing PRs and keeps manual control when
needed.

## Workflow Overview

- `.github/workflows/pr-review-on-push.yml`: Kicks off fresh reviews after a
  push to an existing PR branch.
- `.github/workflows/pr-review-orchestration.yml`: Tracks CodeRabbit feedback,
  orchestrates Codex fixes, and maintains iteration metadata.

### Push Review Trigger (`pr-review-on-push.yml`)

1. **Debounce pushes**: waits two minutes, then confirms the pushed commit is
   still the branch head. Later pushes cancel earlier runs automatically.
2. **PR discovery**: exits quietly if no open PR targets the branch or if the PR
   already hit the automated iteration cap.
3. **Label hygiene**: guarantees the workflow labels exist, removes
   `awaiting-fixes`, and applies `under-review`.
4. **Review pings**: adds `@coderabbitai review` and `@codex review` comments to
   re-run both reviewers in parallel.

### Review Orchestration (`pr-review-orchestration.yml`)

#### PR metadata initialization

- Runs on PR `opened`, `reopened`, and `edited` events.
- Ensures the workflow labels exist.
- Injects (or resets) the hidden counter comment `<!-- REVIEW_ITERATION: 0 -->`
  in the PR body. Reopening a PR also strips all workflow labels so the author
  can restart a cycle.

#### Handling CodeRabbit actionable comments

- Listens for `coderabbitai[bot]` comments that mention **"Actionable
  comments"** and ignores "No actionable comments" notices.
- Skips if the PR is no longer marked `under-review` or if
  `max-iterations-reached` is already set.
- Reads the counter from the PR body, increments it when below five iterations,
  then:
  - Updates the PR body marker.
  - Swaps labels to `awaiting-fixes`.
  - Comments `@codex fix` to kick off Codex remediation.
- When the counter is already five or higher, the job:
  - Removes workflow labels and applies `max-iterations-reached`.
  - Posts an escalation message to `@Steffen-vdv` and halts further automation.

The push workflow respects the `max-iterations-reached` label and will not
restart the cycle until the label (and counter) are reset manually.

## Required Permissions

Both workflows rely on the repository `GITHUB_TOKEN` with `contents: read`,
`issues: write`, and `pull-requests: write` scopes (configured in the workflow
files).

## Initial Setup

1. Merge these workflows into the default branch.
2. No manual label creation is required; both workflows create the three labels
   on demand if they do not already exist.
3. Confirm CodeRabbit and Codex bots have access to react to mentions in PR
   comments.

## Manual Operations

### Resetting the iteration counter

1. Edit the PR description.
2. Replace the existing counter comment with `<!-- REVIEW_ITERATION: 0 -->`.
3. Remove the `max-iterations-reached` label (if present).
4. Push new commits or manually comment `@coderabbitai review` / `@codex review`
   to restart automation.

### Pausing automation on a PR

- Apply the `max-iterations-reached` label manually. The push workflow will skip
  future triggers until the label is removed.

### Forcing a fresh cycle without new pushes

- Remove `awaiting-fixes` and add `under-review`, then comment
  `@coderabbitai review` and `@codex review`. The automation will continue from
  there.

## Troubleshooting Tips

- **Automation did not comment after a push**: Ensure the PR body still contains
  the counter comment and that the PR is not labeled `max-iterations-reached`.
- **Codex was not pinged**: CodeRabbit must send an actionable comment while the
  PR carries the `under-review` label. Manual reviewer comments will not trigger
  the workflow.
- **Counter increased unexpectedly**: Multiple actionable comments in the same
  review cycle are ignored once `under-review` is removed. If it still
  increments, reset the counter manually and reopen the PR.

With these workflows active, CodeRabbit and Codex collaborate automatically,
while maintainers retain control over manual interventions.
