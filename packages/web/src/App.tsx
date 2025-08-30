import React, { useState, useEffect } from 'react';
import Game from './Game';

type Screen = 'menu' | 'overview' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameKey, setGameKey] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/');
    }
  }, []);

  if (screen === 'overview') {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">Game Overview</h1>
        <p className="mb-2">
          👑 Kingdom Builder is a turn-based duel where two rulers expand their
          realm and try to outmaneuver the other. Protect your 🏰 castle, grow
          your 🗺️ lands and keep your people 😊 happy to prevail.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">🎯 Goal</h2>
        <p>Win the duel in one of three ways:</p>
        <ul className="list-disc list-inside mb-2">
          <li>Reduce the enemy 🏰 castle to 0 HP</li>
          <li>Bankrupt your foe during 🧾 Upkeep</li>
          <li>Hold the most victory points after the final round</li>
        </ul>
        <h2 className="text-xl font-semibold mt-4 mb-2">⏱️ Phases</h2>
        <p>Each turn flows through three phases:</p>
        <ul className="list-disc list-inside mb-2">
          <li>
            <strong>🏗️ Development</strong> – your realm produces resources and
            triggered effects take place.
          </li>
          <li>
            <strong>🧹 Upkeep</strong> – pay for your population and resolve
            ongoing effects.
          </li>
          <li>
            <strong>🎯 Main</strong> – both players secretly choose actions and
            then resolve them in turn.
          </li>
        </ul>
        <h2 className="text-xl font-semibold mt-4 mb-2">🧰 Core Concepts</h2>
        <p className="mb-2">
          Actions spend ⚡ Action Points and often 🪙 Gold to gain benefits like
          new 🏚️ developments or 🏛️ buildings. Land around your castle can be
          expanded and improved, while population roles provide bonuses or
          military strength.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">
          🎒 Starting Resources
        </h2>
        <ul className="list-disc list-inside mb-4">
          <li>10 🪙 Gold</li>
          <li>2 🗺️ Land tiles (one with a 🌾 Farm)</li>
          <li>🏰 Castle HP 10 and one 🏠 House</li>
          <li>1 ⚖️ Council member providing the first ⚡ Action Point</li>
        </ul>
        <div className="flex gap-2">
          <button
            className="border px-4 py-2 transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer"
            onClick={() => setScreen('menu')}
          >
            Back to Start
          </button>
          <button
            className="border px-4 py-2 transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer"
            onClick={() => {}}
          >
            Tutorial
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'game') {
    return (
      <Game
        key={gameKey}
        onExit={() => setScreen('menu')}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col gap-4 items-center justify-center">
      <h1 className="text-3xl font-bold">Kingdom Builder</h1>
      <button
        className="border px-4 py-2 transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer"
        onClick={() => {
          setGameKey((k) => k + 1);
          setScreen('game');
        }}
      >
        Start New Game
      </button>
      <button
        className="border px-4 py-2 transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer"
        onClick={() => setScreen('overview')}
      >
        Game Overview
      </button>
      <button
        className="border px-4 py-2 transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-pointer"
        onClick={() => {}}
      >
        Tutorial
      </button>
    </div>
  );
}
