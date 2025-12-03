# CLAUDE.md – AI Assistant Quick Reference

This file provides essential context for AI assistants working with the Kingdom
Builder codebase. For detailed guidance, see [`AGENTS.md`](AGENTS.md) and
[`docs/agent-quick-start.md`](docs/agent-quick-start.md).

## Project Overview

Kingdom Builder is a turn-based 1v1 strategy game built entirely through
AI-assisted development. The codebase uses npm workspaces with five packages:

| Package  | Purpose                                          |
| -------- | ------------------------------------------------ |
| contents | Game data: actions, buildings, resources, phases |
| protocol | Shared TypeScript types and zod schemas          |
| engine   | Deterministic game loop, effects, registries     |
| server   | Fastify HTTP transport, session management, auth |
| web      | Vite + React client                              |

## Essential Commands

```bash
# Development
npm install              # Install dependencies (runs prepare for Husky)
npm run dev              # Start server + web client together

# Quality gates (run before any commit)
npm run format           # Apply Prettier (tabs, 80-char lines)
npm run lint             # ESLint + dependency-cruiser
npm run check            # format:check + typecheck + lint + test
npm run verify           # Full check + test:coverage (logs to artifacts/)

# Testing
npm run test:quick       # Fast Vitest suite for iteration
npm run test:coverage    # Full coverage run

# UI metadata
npm run generate:snapshots  # Refresh cached registry metadata after content changes
```

## Pre-Commit Workflow

Husky hooks enforce quality gates automatically:

1. **pre-commit**: `lint-staged` → `npm run check:ci` → `npm run test:quick`
2. **pre-push**: `npm run verify` (with fallback to check + test:coverage)

Never bypass these hooks. Fix failures locally before committing.

## Coding Standards

| Rule        | Requirement                                            |
| ----------- | ------------------------------------------------------ |
| Braces      | Always use braces, even for single-statement bodies    |
| Line length | ≤80 characters                                         |
| File length | ≤350 lines for new files (\*.test.ts files are exempt) |
| Naming      | Descriptive identifiers; camelCase/PascalCase          |
| Indentation | Tabs (not spaces)                                      |

## File Operations

**Always read files before editing or writing to them.** The Edit tool will
reject changes to files that haven't been read in the current session. This
prevents blind edits and ensures you understand the current file state:

```
# Correct workflow
1. Read the file first
2. Understand its structure and content
3. Make targeted edits

# Incorrect - will fail
Edit a file without reading it first → Error: "File has not been read yet"
```

When modifying multiple files, read each one before editing. This avoids wasted
round-trips and keeps context accurate.

## Content-Driven Architecture

**Never hardcode game data.** All resource keys, stat values, icons, and labels
must come from `@kingdom-builder/contents`:

- Engine and web must load data from registries at runtime
- Tests use `createContentFactory()` for synthetic fixtures
- UI metadata flows: contents → server → web context → components
- When icons/labels change, edit contents and run `npm run generate:snapshots`

## Package Boundaries

- **Web** → imports only from engine's public API via server HTTP calls
- **Engine** → consumes content definitions; never imports from web
- **Contents** → pure data; no runtime logic
- **Protocol** → shared types only; imported by all packages

## Key Documentation

- [`docs/agent-quick-start.md`](docs/agent-quick-start.md) – Mandatory workflow
- [`docs/text-formatting.md`](docs/text-formatting.md) – Translation pipeline
- [`docs/ui-change-playbook.md`](docs/ui-change-playbook.md) – UI update process
- [`docs/domain-boundaries.md`](docs/domain-boundaries.md) – Package contracts
- [`docs/architecture/navigation-cheatsheet.md`](docs/architecture/navigation-cheatsheet.md) – Module index

## PR Submission

1. Run `npm run format`, `npm run lint`, `npm run check`, and `npm run verify`
2. Copy `.github/PULL_REQUEST_TEMPLATE.md` into the PR body
3. Fill all sections—reviewers bounce PRs with incomplete templates
4. For text changes, complete the checklist from
   [`docs/text-formatting.md`](docs/text-formatting.md#0-before-writing-text)

## Common Patterns

### Effect System

Effects use `type:method` pairs registered in `EFFECTS`:

```typescript
{ type: 'resource', method: 'add', params: { key: 'gold', amount: 2 } }
```

Compose with builders:

```typescript
effect('resource', 'add').param('key', 'gold').param('amount', 2);
```

### Testing

```typescript
const content = createContentFactory();
const action = content.action({ effects: [...] });
const ctx = createTestEngine(content);
// Assert against dynamic content values, not literals
```

### Translation Layer

- `summarizeContent()` – Compact previews
- `describeContent()` – Detailed explanations
- `logContent()` – Past-tense action logs

## Game Flow Reference

Turns have three phases:

1. **Growth** – Collect income, gain AP, grow military
2. **Upkeep** – Pay upkeep, resolve end-of-phase effects
3. **Main** – Spend AP on actions (expand, develop, attack)

Victory: Capture enemy castle, force bankruptcy, or hold most VP at game end.
