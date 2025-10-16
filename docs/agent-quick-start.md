# Agent Quick Start

This checklist condenses the non-negotiable rules from
[`AGENTS.md`](../AGENTS.md). Follow it before making any change; use the main
guide for rationale, lore, and extended background.

## 1. Required Workflow

1. **Set up tooling**
   - Install Node.js 18+ and run `npm install` from the repository
     root.
   - Only the root `package-lock.json` is tracked; do not add per-package
     lockfiles.
   - Restore your PATH in minimal shells:
     `export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`.
2. **Run core commands**
   - `npm run lint` and `npm run format` keep eslint and Prettier happy.
   - `npm run lint` also runs dependency-cruiser to enforce package
     boundaries.
   - [`npm run verify`](../scripts/run-verification.mjs) runs `npm run check`
     followed by `npm run test:coverage`. It streams output into timestamped
     logs inside `artifacts/` so you can share the run when needed.
   - Stop immediately if any of these commands fail. Fix the reported problem
     (formatting, type errors, lint drift, or test regressions) and re-run the
     command locally before staging changes so the PR lands clean.

- The Husky pre-push hook enforces that verification run (with a fallback
  to `npm run check && npm run test:coverage` on tooling failures). If you
  must execute the fallback manually, note the environment issue in your PR
  body so reviewers know why the hook could not complete normally.
- Husky also runs the commit-time trio: `lint-staged`, `npm run check`,
  and `npm run test:quick`. Never bypass the hooks; fix the underlying
  problem so the automated gates pass cleanly before calling `make_pr`.
- Reach for `npm run fix` after Prettier when eslint complains about
  spacing or other autofixable style violations.
- `npm run check` still runs linting, type checks, and tests together if you
  need a direct invocation or the verification script is unavailable.
- Documentation-only updates or pure content typo fixes may skip coverage
  runs entirely—note the exception in your PR body so reviewers know it was
  intentional.
- Expect `npm run check` to take about two minutes; the Vitest progress
  reporter prints live suite counts so the run is not stuck.
- Use `npm run build` only when you must validate a production bundle.
- See [`AGENTS.md` §2.5](../AGENTS.md#25-testing-workflow) for the complete
  testing workflow policy and quick-run commands.

### Before pushing or calling `make_pr`

- Run `npm run format` to ensure tabs and other Prettier conventions are
  applied across the repository.
- Use `npm run fix` (or rerun `npm run lint`) until eslint reports success;
  do not rely on reviewers to catch spacing or rule violations.
- Execute `npm run check` followed by `npm run verify` and confirm that both
  commands finish without errors or uncommitted file changes. Re-run the
  commands after fixing any issues to verify the workspace is clean.
- Husky installs the `pre-commit` and `pre-push` hooks automatically when you
  run `npm install` (`npm run prepare` manually reapplies them if necessary).
  Never bypass the hooks—resolve the reported failures locally before pushing.

3. **Work content-first**
   - Never hardcode game data in engine, web, or tests—load from
     `@kingdom-builder/contents` or registries.
   - Tests should create data through `createContentFactory()` or other
     registries so ids and numbers stay dynamic.
   - Respect dependency boundaries: the web app imports engine code only
     from `@kingdom-builder/engine`, and the engine runtime never reaches into
     web or content internals beyond registry surfaces.
4. **Honor the PR template**
   - Copy `.github/PULL_REQUEST_TEMPLATE.md` into every PR body and replace all
     placeholders with specific details before calling `make_pr`.
5. **Respect text standards**
   - Before touching player-facing copy, complete the "Before Writing Text"
     checklist in
     [`docs/text-formatting.md`](text-formatting.md#0-before-writing-text).
   - Paste the quick reference from that section into the PR description when
     strings change.

### Working with remote branches (for resolving code/merge conflicts)

- Inspect `.git/FETCH_HEAD` to see the upstream URL recorded for reference. (at
  time of writing it is `https://github.com/Steffen-vdv/kingdom-builder-game`)
- When you are asked to resolve conflicts with another branch, run the
  following commands from the `work` branch:
  1. `git remote add origin <upstream URL from .git/FETCH_HEAD>`
     (only once per workspace).
  2. `git fetch origin <branch-name>` to download the target branch.
  3. `git merge origin/<branch-name>` to merge the fetched branch into `work`
     and surface conflicts.
  4. Use `git status` to review conflicts, edit the listed files, then `git add`
     the resolved changes.
  5. Finish with `git merge --continue` (or `git merge --abort` to back out if
     needed).

## 2. Coding Rules Snapshot

| Area        | Requirement                                                       |
| ----------- | ----------------------------------------------------------------- |
| Braces      | Wrap every conditional and loop body in braces.                   |
| Line length | Keep lines ≤ 80 characters.                                       |
| File length | Keep new runtime files ≤ 350 lines (legacy exceptions ok;         |
|             | `*.test.ts` files are exempt).                                    |
| Naming      | Descriptive identifiers (`camelCase` values, `PascalCase` types). |
| Formatting  | Use tabs and run Prettier via `npm run format`.                   |

## 3. When You Need Detail

- The full rationale, architectural lore, and gameplay reference begin in
  [`AGENTS.md`](../AGENTS.md#1-core-agent-principles).
- Combat, passive, and session deep dives live in the
  [`architecture/navigation cheatsheet`](architecture/navigation-cheatsheet.md)
  so you can jump straight to the right engine/service modules.
- Translation inventories and helper tables live in
  [`docs/text-formatting.md`](text-formatting.md#1-translation-pipeline-overview).
  Consult them after completing the mandatory checklist above.
