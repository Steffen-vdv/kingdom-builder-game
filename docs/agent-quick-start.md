# Agent Quick Start

This checklist condenses the non-negotiable rules from
[`AGENTS.md`](../AGENTS.md). Follow it before making any change; use the main
guide for rationale, lore, and extended background.

## 1. Required Workflow

1. **Set up tooling**
   - Install Node.js 18+ and run `npm install` from the repository root.
   - Only the root `package-lock.json` is tracked; do not add per-package
     lockfiles.
   - Restore your PATH in minimal shells:
     `export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`.
2. **Run core commands**
   - `npm run lint` and `npm run format` keep eslint and Prettier happy.
   - `npm run lint` also runs dependency-cruiser to enforce package boundaries.
   - `npm run check` runs linting, type checks, and tests together.
   - Use `npm run build` only when you must validate a production bundle.
3. **Work content-first**
   - Never hardcode game data in engine, web, or tests—load from
     `@kingdom-builder/contents` or registries.
   - Tests should create data through `createContentFactory()` or other
     registries so ids and numbers stay dynamic.
   - Respect dependency boundaries: the web app imports engine code only from
     `@kingdom-builder/engine`, and the engine runtime never reaches into web or
     content internals beyond registry surfaces.
4. **Honor the PR template**
   - Copy `.github/PULL_REQUEST_TEMPLATE.md` into every PR body and replace all
     placeholders with specific details before calling `make_pr`.
5. **Respect text standards**
   - Before touching player-facing copy, complete the "Before Writing Text"
     checklist in
     [`docs/text-formatting.md`](text-formatting.md#0-before-writing-text).
   - Paste the quick reference from that section into the PR description when
     strings change.

## 2. Coding Rules Snapshot

| Area        | Requirement                                                       |
| ----------- | ----------------------------------------------------------------- |
| Braces      | Wrap every conditional and loop body in braces.                   |
| Line length | Keep lines ≤ 80 characters.                                       |
| File length | Keep new runtime files ≤ 250 lines (legacy exceptions ok;         |
|             | `*.test.ts` files are exempt).                                    |
| Naming      | Descriptive identifiers (`camelCase` values, `PascalCase` types). |
| Formatting  | Use tabs and run Prettier via `npm run format`.                   |

## 3. When You Need Detail

- The full rationale, architectural lore, and gameplay reference begin in
  [`AGENTS.md`](../AGENTS.md#1-core-agent-principles).
- Translation inventories and helper tables live in
  [`docs/text-formatting.md`](text-formatting.md#1-translation-pipeline-overview).
  Consult them after completing the mandatory checklist above.
