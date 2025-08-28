import React, { useState } from 'react';
import Game from './Game';

function Menu({
  onStart,
  onOverview,
}: {
  onStart: () => void;
  onOverview: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 h-screen justify-center font-sans">
      <h1 className="text-3xl font-bold">Kingdom Builder</h1>
      <button className="border px-4 py-2" onClick={onStart}>
        Start New Game
      </button>
      <button className="border px-4 py-2" onClick={onOverview}>
        Game Overview
      </button>
    </div>
  );
}

function Overview({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto p-4 font-sans space-y-4">
      <h1 className="text-2xl font-bold text-center">Game Overview</h1>
      <p>
        Kingdom Builder is a turn-based duel where you grow your realm and
        attempt to outmaneuver your rival. Protect your castle, expand your
        lands, and manage your resources to prevail.
      </p>
      <h2 className="text-xl font-semibold">Goal</h2>
      <p>
        Outlast or conquer your opponent. A game can end when a castle falls,
        when a player can no longer sustain their realm, or when the final round
        ends with one ruler holding the advantage.
      </p>
      <h2 className="text-xl font-semibold">Phases</h2>
      <p>Each turn flows through three phases:</p>
      <ul className="list-disc list-inside">
        <li>
          <strong>Development</strong> – your realm produces resources and
          triggered effects take place.
        </li>
        <li>
          <strong>Upkeep</strong> – maintain your population and resolve ongoing
          effects.
        </li>
        <li>
          <strong>Main</strong> – both players secretly choose actions and then
          resolve them in turn.
        </li>
      </ul>
      <h2 className="text-xl font-semibold">Core Mechanics</h2>
      <p>
        Actions may require resources or other prerequisites and grant various
        effects, such as gaining resources, building structures, developing
        land, or hindering your opponent. Buildings provide passive bonuses,
        while land around your castle holds developments that yield benefits.
        Resources like Gold, Action Points, Happiness, and Castle Health are
        spent and gained throughout the game.
      </p>
      <button className="mt-4 border px-4 py-2" onClick={onBack}>
        Back to Start
      </button>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'overview' | 'game'>('menu');

  if (screen === 'game') return <Game onExit={() => setScreen('menu')} />;
  if (screen === 'overview')
    return <Overview onBack={() => setScreen('menu')} />;
  return (
    <Menu
      onStart={() => setScreen('game')}
      onOverview={() => setScreen('overview')}
    />
  );
}
