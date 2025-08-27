# Contributing

Thanks for your interest in improving Kingdom Builder! This guide describes the
workflow for contributors so that changes remain consistent and easy to review.

## Development Setup

1. Install [Node.js](https://nodejs.org/) **18 or newer**.
2. Install dependencies with `npm install`.
3. Use `npm run dev` to start the web client during development.
4. Run `npm run type-check` to ensure the codebase compiles under TypeScript.
5. Run `npm run lint` to check formatting and unused imports.

## Testing Conventions

- Always run `npm test` before committing. The script runs ESLint and Vitest.
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
- Ensure `npm test` and `npm run type-check` pass before pushing.
- Limit commit message subject lines to ~70 characters.

For architectural details see [ARCHITECTURE.md](docs/ARCHITECTURE.md). If in
doubt about how to structure new behaviour, consult that document and existing
tests for examples.
