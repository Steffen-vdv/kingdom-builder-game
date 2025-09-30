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

## Formatting

These formatting rules apply to source files that participate in the game
runtime (engine packages, shared utilities, the web client, and automated
tests). Documentation (`*.md`) and peripheral tooling that does not run in the
game experience (e.g., `overview.tsx` used for repository overviews) can follow
context-specific conventions.

- **Indent with tabs.** Tabs keep indentation consistent across editors while
  letting contributors choose their preferred display width.
- **Limit lines to 80 characters.** Break up long expressions with intermediate
  variables or helper functions.
- **Wrap every scope in braces.** Conditionals, loops and other block
  statements must always use braces even when the body is a single statement.
- **Keep files under 250 lines.** When a module grows beyond this limit,
  extract helpers into neighbouring files or dedicated utility modules. Splits
  should follow logical boundaries (e.g., grouping related evaluators or
  separating React components by concern).
- Prefer clarity over brevity and keep functions focused on a single task.
- Derive values from configuration or registries rather than hard coding
  numbers in tests.

## Testing

- Unit tests live under `packages/engine/tests`.
- Integration tests live under `tests/integration`.
- See [CONTRIBUTING](../../CONTRIBUTING/AGENTS.md) for the recommended testing workflow.

These standards help ensure consistent contributions across the repository.
