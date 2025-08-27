# Contributing

Thanks for your interest in improving Kingdom Builder! This guide describes the
workflow for contributors so that changes remain consistent and easy to review.

## Development Setup

1. Install [Node.js](https://nodejs.org/) **18 or newer**.
2. Install dependencies with `npm install`.
3. Use `npm run dev` to start the web client during development.
4. Run `npm run type-check` to ensure the codebase compiles under TypeScript.
5. Run `npm run lint` to check formatting and unused imports.
6. Run `npm run build` to verify the production build succeeds.

## Testing Conventions

- Tests are split into three levels:
  - **Unit tests** under `packages/engine/tests`.
  - **Integration tests** under `tests/integration`.
  - **End-to-end tests** under `e2e` (Playwright).
- Run unit and integration tests with `npm test`.
- Run end-to-end tests (requires the Playwright Chromium browser):

  ```bash
  npx playwright install-deps chromium # Linux only, run once
  npx playwright install chromium
  npm run e2e
  ```

- Always run `npm test`, `npm run e2e`, and `npm run build` before committing.
  The `npm test` script runs ESLint and Vitest for unit/integration tests.
- New features and bug fixes **must** include tests. Derive expectations from
  the active configuration or mocked registries instead of hard-coded numbers.
- Use the registry pattern to swap implementations in tests when needed. Avoid
  importing concrete handlers directly.
- Prefer high level integration tests for complex behaviours and unit tests for
  individual effect handlers.

## Commit Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/). Use a
  type and optional scope, e.g. `feat(engine): add farm effect`.
- Keep commits focused; avoid mixing unrelated changes or drive-by edits.
- Update documentation and tests in the same commit as the code change when
  possible.
- Ensure `npm test`, `npm run type-check`, and `npm run build` pass before pushing.
- The pre-commit hook runs `lint-staged`, `npm run lint`, `npm run type-check`, and `npm test`. Fix any issues before committing.
- Limit commit message subject lines to ~70 characters.

For architectural details see [ARCHITECTURE.md](docs/ARCHITECTURE.md). If in
doubt about how to structure new behaviour, consult that document and existing
tests for examples.
