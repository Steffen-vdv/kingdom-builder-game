# Code Standards

This project follows a few simple conventions to keep the codebase readable and
maintainable.

## Naming

- Use **descriptive names** for variables, functions, classes and files.
  - Avoid one-letter identifiers except for well known generic type parameters.
  - Abbreviations should be expanded (`populationDefinition` instead of `def`).
- Variables and functions use `camelCase`; classes and types use `PascalCase`.

## Style

- The repository is formatted with Prettier; run `npm run lint` to format code.
- Prefer clarity over brevity and keep functions focused on a single task.
- Derive values from configuration or registries rather than hard coding
  numbers in tests.

## Testing

- Unit tests live under `packages/engine/tests`.
- Integration tests live under `tests/integration`.
- End-to-end tests live under `e2e`.
- Run `npm test`, `npm run e2e` and `npm run build` before committing.

These standards help ensure consistent contributions across the repository.
