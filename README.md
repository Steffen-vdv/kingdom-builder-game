# 👑 Kingdom Builder v5.11

## 0) Preface

This repository has been entirely brought to life through AI (ChatGPT Codex). The technical and conceptual vision of the game was invented and curated by a human, but every single line of code (bar some `.md` files) were generated solely by AI, through a human-curated iterative process. A consolidated `AGENTS.md` at the repository root captures all guidelines so AI agents understand and conform to the vision.

At time of writing, this project is still heavily W.I.P. and should not by any means be interpreted as a reflection of the final product. Lots left to do!

## 1) Setup

1. Install [Node.js](https://nodejs.org/) (v18+ recommended).
2. Install dependencies: `npm install` (uses npm workspaces to link local packages)
3. Navigate to `/packages/web/` and start the development server: `npm run dev`
4. Build for production: `npm run build`

## 2) Game Overview

Kingdom Builder is a turn-based 1v1 strategy game. Players grow their realm, manage resources, and try to outlast or conquer the opponent. Victory is achieved by capturing the opposing castle, forcing enemy bankruptcy, or holding the most victory points when the game ends after the final round.

## 3) Repository overview

The repository consists of three isolated domains: Web, Content and Engine. Each is represented as a directory inside `/packages`

- Engine: The _technical_ heart of the game. Engine is responsible for driving the core game loop, execute actions, maintaining game state and evaluating effects. It can be considered 'the backend'.
- Web: The _visual_ heart of the game. This domain is responsible for housing the game's frontend. It talks to Engine domain to receive game state updates and inform Engine of player-driven actions.
- Content: The _practical_ heart of the game. This domain houses all of the game's configurations. The domain is configured in a way that allows extremely broad and deep updates to the game's configuration. The intent is for this domain to eventually become separated into it's own service and either passed to a content curation team or even allow players themselves to build gamemodes by giving them access, through some interface, to manipulate/override parts of 'Contents' domain at runtime.

## 4) Coding Standards

To keep the project readable and maintainable, every contribution must follow
these rules:

- Use braces around every conditional or loop body, even when it contains a
  single statement.
- Wrap lines at 80 characters to prevent horizontal scrolling in reviews.
- Keep individual source files at or below 250 lines unless legacy code already
  exceeds the limit.
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
