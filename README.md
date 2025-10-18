# 👑 Kingdom Builder v5.11

## 0) Preface

This repository has been entirely brought to life through AI (ChatGPT Codex). The
technical and conceptual vision of the game was invented and curated by a human,
but every single line of code (bar some `.md` files) were generated solely by
AI, through a human-curated iterative process. Agents should begin with
[`docs/agent-quick-start.md`](docs/agent-quick-start.md) for the mandatory
workflow and then consult the consolidated `AGENTS.md` at the repository root
for detailed guidance and lore.

At time of writing, this project is still heavily W.I.P. and should not by any means be interpreted as a reflection of the final product. Lots left to do!

## 1) Setup

1. Install [Node.js](https://nodejs.org/) (v18+ recommended).
2. Install dependencies: `npm install` (uses npm workspaces to link local packages).
3. Start the combined dev environment (Fastify server + Vite web client):
   `npm run dev`. The wrapper automatically loads
   `config/server-auth.tokens.default.json` so the development server boots with
   an admin token.
4. Override the default token table when you need different credentials by
   either creating `config/server-auth.tokens.local.json` (ignored by git) or by
   exporting a `KB_SERVER_AUTH_TOKENS` environment variable that contains your
   JSON token map.
5. Run a single target when needed:
   - Web client only: `npm run dev:web`
   - Server only: `npm run server:dev`
   - UI test stack (Fastify + Vite with Playwright ports): `npm run dev:ui-tests`
6. Build production bundles for both server and web: `npm run build`.
7. Build just the Node server bundle: `npm run server:build`.
8. Launch the production server locally with `npm run start` after supplying a
   real token map via `KB_SERVER_AUTH_TOKENS` or
   `config/server-auth.tokens.local.json`. The wrapper enables `NODE_ENV=production`,
   ignores the default dev token file, and refuses to start without valid tokens.
9. Review the docs directory for additional deep dives into systems and lore.

### Verification workflow

- `npm run verify` runs the full quality gate (`npm run check` followed by
  `npm run test:coverage`) and streams each command into timestamped logs under
  `artifacts/`. Share those logs when asking for review support or debugging a
  failing step.

### Pre-PR checklist

- Run `npm run format` to enforce tab indentation and other Prettier rules.
- Use `npm run fix` (or rerun `npm run lint`) until eslint succeeds without
  warnings or auto-fixable errors.
- Execute `npm run check` and then `npm run verify`. Resolve any failures and
  rerun the commands until both complete cleanly without changing files.
- Run `npm run test:ui` whenever your changes touch UI layout, copy, or other
  rendered elements so reviewers can trust the Playwright coverage.
- Husky installs the repository's `pre-commit` and `pre-push` hooks during
  `npm install`. If the hooks ever go missing, run `npm run prepare` and do not
  bypass them—fix the reported issues locally before pushing.

## 2) Game Overview

Kingdom Builder is a turn-based 1v1 strategy game. Players grow their realm, manage resources, and try to outlast or conquer the opponent. Victory is achieved by capturing the opposing castle, forcing enemy bankruptcy, or holding the most victory points when the game ends after the final round.

## 3) Repository overview

The project is organized into five domains housed under `/packages`. Web is the
frontend, while the backend combines the Server, Engine, Content, and Protocol
packages. The web client always communicates with the backend through the
server's HTTP API, and the backend, in turn, hosts the engine runtime alongside
the content registries it consumes.

- **Web**: Presents the game state, maps engine identifiers to localized
  content, and forwards user intent to the backend exclusively through the
  server/API boundary.
- **Server**: Hosts HTTP transport, authentication, and session lifecycle logic
  around the engine. It bootstraps engine instances with content registries and
  serializes responses using shared protocol types. See
  [`docs/server-auth.md`](docs/server-auth.md) for configuring the
  authentication stub used by transport routes.
- **Engine**: Executes the deterministic game loop by interpreting content
  definitions, resolving effects, and emitting serializable snapshots for
  clients.
- **Content**: Supplies schema-validated definitions, registries, and metadata
  that describe actions, buildings, and other gameplay elements consumed by the
  engine and web client.
- **Protocol**: Publishes the canonical TypeScript types and zod schemas shared
  across packages so that web and server calls remain in lockstep with the
  engine state.

## 4) Coding Standards

To keep the project readable and maintainable, every contribution must follow
these rules:

- Use braces around every conditional or loop body, even when it contains a
  single statement.
- Wrap lines at 80 characters to prevent horizontal scrolling in reviews.
- Keep individual source files at or below 350 lines unless legacy code already
  exceeds the limit; `*.test.ts` files are exempt from this rule.
- Choose descriptive, human-readable identifiers instead of terse abbreviations.
- Indent code with tab characters so formatting remains consistent across
  editors.

## 5) Turn Structure

Each turn flows through three phases:

1. **Growth** – collect income, gain action points, and grow your military.
2. **Upkeep** – pay upkeep for your people and resolve end-of-phase effects.
3. **Main** – spend action points to perform strategic actions such as expanding your territory, developing lands, or attacking the enemy.

## 6) Starting Setup

- 10 🪙 Gold
- 2 🗺️ Land tiles (one with a 🌾 Farm)
- Castle HP 10 and one 🏠 House
- Population: 1 ⚖️ Council member
- Player order: A then B; B gains +1 ⚡️ Action Point on their first Growth phase
