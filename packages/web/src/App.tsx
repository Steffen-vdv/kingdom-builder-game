import React, { useState, useEffect } from 'react';
import Game from './Game';
import {
  ACTION_INFO as actionInfo,
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
  RESOURCES,
} from '@kingdom-builder/contents';
import { Resource } from '@kingdom-builder/engine';

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
        <p>
          Kingdom Builder is a turn-based duel where you grow your realm and
          attempt to outmaneuver your rival. Protect your castle, expand your{' '}
          {landIcon} lands, and manage your resources to prevail.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">Goal</h2>
        <p>
          Outlast or conquer your opponent. A game can end when a castle falls,
          when a player can no longer sustain their realm, or when the final
          round ends with one ruler holding the advantage.
        </p>
        <h2 className="text-xl font-semibold mt-4 mb-2">Phases</h2>
        <p>Each turn flows through three phases:</p>
        <ul className="list-disc list-inside mb-2">
          <li>
            <strong>Development</strong> – your realm produces resources and
            triggered effects take place.
          </li>
          <li>
            <strong>Upkeep</strong> – maintain your population and resolve
            ongoing effects.
          </li>
          <li>
            <strong>Main</strong> – both players secretly choose actions and
            then resolve them in turn.
          </li>
        </ul>
        <h2 className="text-xl font-semibold mt-4 mb-2">Core Mechanics</h2>
        <p className="mb-4">
          Actions may require resources or other prerequisites and grant various
          effects, such as gaining resources, {actionInfo['build']?.icon}{' '}
          building structures, {actionInfo['develop']?.icon} developing{' '}
          {landIcon} land, or hindering your opponent.{' '}
          {actionInfo['build']?.icon} Buildings provide ♾️ passive bonuses,
          while {landIcon} land around your castle holds {slotIcon} developments
          that yield benefits. Resources like
          {RESOURCES[Resource.gold].icon} Gold, {RESOURCES[Resource.ap].icon}{' '}
          Action Points, {RESOURCES[Resource.happiness].icon} Happiness, and{' '}
          {RESOURCES[Resource.castleHP].icon} Castle Health are spent and gained
          throughout the game.
        </p>
        <button
          className="border px-4 py-2 hoverable cursor-pointer"
          onClick={() => setScreen('menu')}
        >
          Back to Start
        </button>
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-red-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex flex-col gap-4 items-center justify-center p-8 rounded-lg shadow-lg bg-white dark:bg-gray-800">
        <div className="text-6xl">🏰</div>
        <h1 className="text-3xl font-bold">Kingdom Builder</h1>
        <button
          className="border px-4 py-2 hoverable cursor-pointer"
          onClick={() => {
            setGameKey((k) => k + 1);
            setScreen('game');
          }}
        >
          Start New Game
        </button>
        <button
          className="border px-4 py-2 hoverable cursor-pointer"
          onClick={() => setScreen('overview')}
        >
          Game Overview
        </button>
      </div>
    </div>
  );
}
