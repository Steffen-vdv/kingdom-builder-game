# Code Standards

## 🚫 Hardcoded content prohibited

- **Engine and Web may not hardcode game data.** All resource/stat keys, starting values and effect behaviour belong in the Content domain and can change at any time.
- **Tests may not rely on literals.** Always pull ids and values from the content registries or mocks; content tweaks should not require test updates unless they reveal unsupported scenarios.

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
- See [CONTRIBUTING](../../CONTRIBUTING/AGENTS.md) for the recommended testing workflow.

These standards help ensure consistent contributions across the repository.
