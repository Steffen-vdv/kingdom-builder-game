# 👑 Kingdom Builder v5.11

## 0) Preface

This repository has been entirely brought to life through AI. The technical and
conceptual vision of the game was invented and curated by a human, but every
single line of code (bar some `.md` files) were generated solely by AI, through
a human-curated iterative process. The project began with ChatGPT Codex, and
Claude joined the development effort later to continue building out the game.

**For AI agents**: Read [`CLAUDE.md`](CLAUDE.md) completely before starting any
task. It contains the operating manual, workflow protocols, and architectural
guidance.

At time of writing, this project is still heavily W.I.P. and should not by any
means be interpreted as a reflection of the final product. Lots left to do!

## 1) Setup

1. Install [Node.js](https://nodejs.org/) (v18+ recommended).
2. Install dependencies: `npm install` (uses npm workspaces to link local
   packages).
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
6. Build production bundles for both server and web: `npm run build`.
7. Build just the Node server bundle: `npm run server:build`.
8. Launch the production server locally with `npm run start` after supplying a
   real token map via `KB_SERVER_AUTH_TOKENS` or
   `config/server-auth.tokens.local.json`. The wrapper enables
   `NODE_ENV=production`, ignores the default dev token file, and refuses to
   start without valid tokens.
9. Review the docs directory for additional deep dives into systems.

### Verification workflow

- `npm run verify` runs the full quality gate (`npm run check` followed by
  `npm run test:coverage`) and streams each command into timestamped logs under
  `artifacts/`. Share those logs when asking for review support or debugging a
  failing step.

### Pre-PR checklist

- Husky pre-commit and pre-push hooks handle formatting, linting, and
  typechecking automatically. Just commit and push.
- Run `npm run test:parallel` if you changed tests.
- Run `npm run verify` once before opening a PR.
