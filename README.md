# 👑 Kingdom Builder v5.11 — Player Guide (Updated 2)

## 1) Setup

1. Install [Node.js](https://nodejs.org/) (v18+ recommended).
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Build for production: `npm run build`

## 2) Testing

- **Unit tests** live in `packages/engine/tests`.
- **Integration tests** live in `tests/integration`.
- **End-to-end tests** live in `e2e` and use Playwright.

Run unit and integration tests:

```bash
npm test
```

Run end-to-end tests (requires Playwright browsers and system deps):

```bash
npx playwright install
npx playwright install-deps # required on Linux
npm run e2e
```

## 3) Game Overview

Kingdom Builder is a turn-based 1v1 strategy game. Players grow their realm, manage resources, and try to outlast or conquer the opponent. Victory is achieved by capturing the opposing castle, forcing bankruptcy, or holding the most victory points when the game ends after the final round.

### Turn Structure

Each turn flows through three phases:

1. **Development** – collect income, gain action points, and grow your military.
2. **Upkeep** – pay upkeep for your people and resolve end-of-phase effects.
3. **Main** – spend action points to perform strategic actions such as expanding your territory, developing lands, or attacking the enemy.

### Starting Setup

- 10 🪙 Gold
- 2 🗺️ Land tiles (one with a 🌾 Farm)
- Castle HP 10 and one 🏠 House
- Population: 1 ⚖️ Council member
- Army Strength 0, Fortification Strength 0, Happiness 0
- Player order: A then B; B gains +1 ⚡️ Action Point on their first Development phase

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing conventions,
and commit guidelines. For an overview of the engine architecture, read
[ARCHITECTURE.md](docs/ARCHITECTURE.md).
