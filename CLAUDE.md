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

## Request Verification Protocol

**Never implement without verification.** Before starting any task, complete
this checklist:

1. **Critically assess the request** – Identify what is being asked, what
   success looks like, and what constraints apply. Flag ambiguities.
2. **Inspect the codebase** – Search for existing patterns, conventions, and
   related code. Understand how similar problems were solved before.
3. **Verify completeness** – Confirm you have all information needed: target
   behavior, edge cases, affected files, and acceptance criteria.
4. **Prevent assumptions** – Do not fill in gaps with guesses or "reasonable
   defaults." Do not add creative flourishes unless explicitly requested.
5. **Ask before implementing** – If any step above is unsatisfactory, **stop**
   and ask clarifying questions. Do not proceed until answers are provided.

### When to block implementation

Stop and ask clarifying questions when:

- The desired end state is ambiguous (e.g., "fix the color" but no target color)
- Multiple valid approaches exist and no preference was stated
- The request conflicts with existing patterns or conventions
- Required values, behaviors, or constraints are missing
- You would need to invent or assume something not in the codebase or request

### How to ask

Present questions as a numbered list. For each question:

- State what information is missing
- Explain why it matters
- Offer your assumption or understanding (if any) for the user to confirm,
  correct, or expand upon

**Example:**

> Before I implement this, I need clarification:
>
> 1. **Target color**: What color should the button be? I see save buttons use
>    green (`--color-success`) elsewhere, but this isn't a save action.
> 2. **Dark mode variant**: Should it use the same color in both themes, or a
>    different shade for dark mode?
> 3. **Hover/active states**: Should these follow the existing button patterns?

Only proceed once the user confirms, corrects, or provides the missing details.

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

## ResourceV2 Prime Directive

**MANDATORY: Everything is a resource.**

The codebase is migrating to a unified ResourceV2 system. Compliance with this
directive is mandatory. Drifting from it is prohibited.

### Core Principle

Stats, population roles, and resources are now unified under ResourceV2. There
is no distinction—all are resources with IDs, labels, icons, and metadata.

### Forbidden Patterns

If you find yourself writing any of these words, **STOP and reassess**:

- `stat` or `stats` (as a concept separate from resources)
- `population` (as a concept separate from resources)
- `legacy` or `compatibility` (for old patterns)
- `mapper` or `converter` (between old and new systems)
- `key` or `role` (as effect parameters instead of `resourceId`)

### Required Patterns

- Use `type: 'resource'` for all resource-based evaluators and effects
- Use `params: { resourceId: '...' }` for all resource references
- Use `resourceMetadataV2.get(id)` for labels, icons, and metadata lookup
- Use `resourceEvaluator().resourceId(...)` in content builders

### Migration Rules

When encountering legacy code:

1. **Do not maintain** legacy `stat`/`population`/`resource(v1)` patterns
2. **Actively migrate** to ResourceV2 patterns
3. **Remove** old code after migration—do not keep compatibility layers
4. **Never parse resource IDs** to derive semantic meaning; use metadata

### Example Migration

```typescript
// WRONG - Legacy pattern
{ type: 'stat', params: { key: 'armyStrength' } }
{ type: 'population', params: { role: 'legion' } }

// CORRECT - ResourceV2 pattern
{ type: 'resource', params: { resourceId: 'resource:stat:army-strength' } }
{ type: 'resource', params: { resourceId: 'resource:population:role:legion' } }
```

### Enforcement

Any PR introducing or maintaining legacy patterns will be rejected. When in
doubt, check if your code references concepts that should be unified resources.

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

## Pre-Commit Checklist

1. Run `npm run format`, `npm run lint`, `npm run check`, and `npm run verify`
2. Fix all errors before committing
3. For text changes, review
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

## Communication Style

- Write informally and casually
- Emojis are welcome, but don't overdo it
- Don't present assumptions as facts — be clear about uncertainty
- Admit when you don't know something rather than guessing
- Avoid "let me..." phrasing; use "I'm going to...", "Let's go ahead and...",
  or similar alternatives
