# 👑 Kingdom Builder v5.11

## 1) Setup

1. Install [Node.js](https://nodejs.org/) (v18+ recommended).
2. Install dependencies: `npm install` (uses npm workspaces to link local packages)
3. Start the development server: `npm run dev` (automatically builds `@kingdom-builder/contents`)
4. Build for production: `npm run build`

Default game content (actions, buildings, etc.) lives in `packages/contents`.
Edit those configs or supply your own registries when creating an engine.

## 2) Game Overview

Kingdom Builder is a turn-based 1v1 strategy game. Players grow their realm, manage resources, and try to outlast or conquer the opponent. Victory is achieved by capturing the opposing castle, forcing bankruptcy, or holding the most victory points when the game ends after the final round.

### Turn Structure

Each turn flows through three phases:

1. **Growth** – collect income, gain action points, and grow your military.
2. **Upkeep** – pay upkeep for your people and resolve end-of-phase effects.
3. **Main** – spend action points to perform strategic actions such as expanding your territory, developing lands, or attacking the enemy.

### Starting Setup

- 10 🪙 Gold
- 2 🗺️ Land tiles (one with a 🌾 Farm)
- Castle HP 10 and one 🏠 House
- Population: 1 ⚖️ Council member
- Army Strength 0, Fortification Strength 0, Happiness 0
- Player order: A then B; B gains +1 ⚡️ Action Point on their first Growth phase
