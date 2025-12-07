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
   - `npm run generate:snapshots` refreshes local UI metadata caches so the web
     client stays aligned with content packages. The automation runs as part of
     the dev scripts, and `npm run check` fails when the generated metadata
     drifts. Stage and commit any regenerated assets before opening a PR.
   - [`npm run verify`](../scripts/run-verification.mjs) runs `npm run check`
     followed by `npm run test:coverage`. It streams output into timestamped
     logs inside `artifacts/` so you can share the run when needed.
   - For UI structure, layout, or copy updates, regenerate snapshots with
     `npm run generate:snapshots` and capture manual screenshots as needed to
     document the change in your PR notes.
   - When icons, labels, or descriptions change, edit the definitions in
     `@kingdom-builder/contents` (see [`packages/contents`](../packages/contents))
     and rerun `npm run generate:snapshots`. Do **not** patch fallback metadata
     in `packages/web`—components read content-driven values at runtime.
   - Stop immediately if any of these commands fail. Fix the reported problem
     (formatting, type errors, lint drift, or test regressions) and re-run the
     command locally before staging changes so the PR lands clean.
   - Regenerate the runtime config fallback with
     `npx tsx scripts/generateRuntimeConfig.ts` whenever content packages change.
     `npm run check` executes
     `packages/web/tests/runtime-config-fallback-sync.test.ts` to enforce this, so
     stale snapshots will block your PR until you rerun the generator.
   - The Husky pre-commit hook runs Prettier on all files and stages changes.
   - The Husky pre-push hook runs typecheck, then lints only changed `.ts/.tsx`
     files. Never bypass the hooks; fix the underlying problem locally.
   - Reach for `npm run fix` after Prettier when eslint complains about
     spacing or other autofixable style violations.
   - `npm run check` still runs linting, type checks, and tests together if you
     need a direct invocation or the verification script is unavailable.
   - Documentation-only updates or pure content typo fixes may skip coverage
     runs entirely.
   - Expect `npm run check` to take about two minutes; the Vitest progress
     reporter prints live suite counts so the run is not stuck.
   - Use `npm run build` only when you must validate a production bundle.
   - See [`AGENTS.md` §2.5](../AGENTS.md#25-testing-workflow) for the complete
     testing workflow policy and quick-run commands.

### Before pushing

- Just commit and push - pre-commit formats, pre-push validates.
- Regenerate snapshots (`npm run generate:snapshots`) for any change that could
  affect rendered UI surfaces.
- Husky installs the `pre-commit` and `pre-push` hooks automatically when you
  run `npm install` (`npm run prepare` manually reapplies them if necessary).
  Never bypass the hooks—resolve the reported failures locally before pushing.

### Efficient command usage

**IMPORTANT: Pick ONE command based on what you need. Do NOT run multiple
commands sequentially - that defeats the purpose of parallelization.**

| What you changed | Command to run                        | Time |
| ---------------- | ------------------------------------- | ---- |
| Code (no tests)  | Just commit and push                  | ~10s |
| Code + tests     | `npm run test:parallel` then push     | ~50s |
| Single test      | `npx vitest run path/to/file.test.ts` | ~5s  |

**Pre-commit formats, pre-push validates.** The pre-commit hook runs Prettier
and stages changes. The pre-push hook runs typecheck + lint on changed files
only (~5-10s). Just commit and push.

**Anti-patterns to avoid:**

- Running `check:parallel` then `test:parallel` sequentially (redundant!)
- Running `npm run verify` for daily work (it's for CI/coverage reports)
- **Avoid `npm run test:sequential` - it's SLOWER than `test:parallel`!**

4. **Work content-first**
   - Never hardcode game data in engine, web, or tests—load from
     `@kingdom-builder/contents` or registries.
   - Tests should create data through `createContentFactory()` or other
     registries so ids and numbers stay dynamic.
   - Respect dependency boundaries: the web app imports engine code only
     from `@kingdom-builder/engine`, and the engine runtime never reaches into
     web or content internals beyond registry surfaces.
   - Icons, labels, and descriptions originate in
     `@kingdom-builder/contents`, flow through the session bootstrapper in
     [`SessionManager.ts`](../packages/server/src/session/SessionManager.ts),
     and surface in React via
     [`RegistryMetadataContext`](../packages/web/src/contexts/RegistryMetadataContext.tsx).
     Update the content package (not web-layer fallbacks) so every layer stays
     in sync.
5. **Respect text standards**
   - Before touching player-facing copy, review
     [`docs/text-formatting.md`](text-formatting.md#0-before-writing-text).

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
- Review [`docs/ui-change-playbook.md`](ui-change-playbook.md) before any UI
  work for the step-by-step checklist that traces metadata from content through
  translators.
- Review [`docs/ui-metadata-pipeline.md`](ui-metadata-pipeline.md) for the
  metadata flow. **JSX-only edits do not update visuals—change the content and
  regenerate snapshots whenever icons or labels shift.**
