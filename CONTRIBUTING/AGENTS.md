# Contributing

## 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** All resource/stat keys, starting values and effect behaviour must originate from the `contents` package so designs can change without modifying core code.
- **Tests may not rely on literals or hard-coded ids.** When writing tests, obtain ids and values from the content domain, factories, or mocks; content changes should not require test updates unless they expose unsupported scenarios.
- **Synthetic content factory.** Use `createContentFactory()` in tests to build actions, buildings, developments, and population roles with auto-generated ids.
- **Property-based testing.** [`fast-check`](https://github.com/dubzzz/fast-check) enables property tests that explore randomised inputs and engine invariants.

Thanks for your interest in improving Kingdom Builder! This guide describes the
workflow for contributors so that changes remain consistent and easy to review.

Please also review our [Code Standards](../docs/code_standards/AGENTS.md) for naming and
style conventions used throughout the repository. Key highlights include tab-based
indentation, 80-character lines, mandatory braces around every scope, and keeping
files under 250 lines by splitting related helpers into focused modules. These
formatting expectations apply to runtime code (engine, shared packages, web, and
tests); Markdown documentation and peripheral utilities like the repository
`overview.tsx` may follow context-specific formatting where that improves clarity.

## Development Setup

1. Install [Node.js](https://nodejs.org/) **18 or newer**.
2. Install dependencies with `npm install`.
3. Use `npm run dev` to start the web client during development.
4. The pre-commit hook automatically lints, type-checks, and tests changed
   files. To run these checks manually across the repository, use
   `npm run check`.
5. Run `npm run build` only when verifying production builds locally.

## Formatting & Linting

- `npm run lint` enforces mandatory braces, 80-character lines, descriptive
  identifiers, and a 250-line ceiling for most files. Legacy modules that
  exceed this limit are temporarily exempt until they can be refactored; new
  code should comply with the cap.
- `npm run format` applies Prettier with tab indentation and the shared
  80-character print width. Run it before committing whenever you touch
  formatted files (TypeScript, JSON, Markdown, etc.).

## Testing Conventions

- Tests are split into two levels:
  - **Unit tests** under `packages/engine/tests`.
  - **Integration tests** under `tests/integration`.
- The pre-commit hook runs `npm run test:quick` for unit and integration tests
  on staged files after `lint-staged` handles formatting, linting, and type
  checking.
- GitHub Actions runs `npm run test:ci` (coverage) and `npm run build` for every pull
  request. Run these scripts locally only when working on related areas or
  debugging failures.
- New features and bug fixes **must** include tests. Derive expectations from
  the active configuration or mocked registries instead of hard-coded numbers.
- Use the registry pattern to swap implementations in tests when needed. Avoid
  importing concrete handlers directly.
- Property-based tests are encouraged for invariant behaviours; generate random
  data with `fast-check`.
- Prefer high level integration tests for complex behaviours and unit tests for
  individual effect handlers.

### 🔧 Dynamic test example

```ts
const content = createContentFactory();
const effect = {
	type: 'resource',
	method: 'add',
	params: { key: CResource.gold, amount: 2 },
};
const action = content.action({ effects: [effect] });
const ctx = createTestEngine(content);
const before = ctx.activePlayer.gold;
performAction(action.id, ctx);
expect(ctx.activePlayer.gold).toBe(before + effect.params.amount);
```

## Commit Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/). Use a
  type and optional scope, e.g. `feat(engine): add farm effect`.
- Keep commits focused; avoid mixing unrelated changes or drive-by edits.
- Update documentation and tests in the same commit as the code change when
  possible.
- Ensure the pre-commit hook passes before pushing. It runs `lint-staged`
  (formatting, linting, and type checks on staged files) followed by
  `npm run test:quick`. Additional checks such as the production build run in
  CI.
- Limit commit message subject lines to ~70 characters.

For architectural details see [ARCHITECTURE](../docs/architecture/AGENTS.md). If in
doubt about how to structure new behaviour, consult that document and existing
tests for examples.
