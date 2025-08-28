# Contributing

Thanks for your interest in improving Kingdom Builder! This guide describes the
workflow for contributors so that changes remain consistent and easy to review.

Please also review our [Code Standards](docs/CODE_STANDARDS.md) for naming and
style conventions used throughout the repository.

## Development Setup

1. Install [Node.js](https://nodejs.org/) **18 or newer**.
2. Install dependencies with `npm install`.
3. Use `npm run dev` to start the web client during development.
4. The pre-commit hook automatically lints, type-checks, and tests changed
   files. To run these checks manually across the repository, use
   `npm run check`.
5. Run `npm run build` only when verifying production builds locally.

## Testing Conventions

- Tests are split into two levels:
  - **Unit tests** under `packages/engine/tests`.
  - **Integration tests** under `tests/integration`.
- The pre-commit hook runs `npm test` for unit and integration tests on staged
  files.
- GitHub Actions runs `npm run test:coverage` and `npm run build` for every pull
  request. Run these scripts locally only when working on related areas or
  debugging failures.
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
- Ensure the pre-commit hook passes before pushing. It runs `lint-staged`,
  `npm run lint`, `npm run type-check`, and `npm test` on staged files.
  Additional checks such as the production build run in CI.
- Limit commit message subject lines to ~70 characters.

For architectural details see [ARCHITECTURE.md](docs/ARCHITECTURE.md). If in
doubt about how to structure new behaviour, consult that document and existing
tests for examples.
