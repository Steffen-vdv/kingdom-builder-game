import React, { useState, useEffect } from 'react';
import Game from './Game';
import {
  ACTIONS as actionInfo,
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
  RESOURCES,
  Resource,
  PHASES,
  POPULATION_ROLES,
  PopulationRole,
} from '@kingdom-builder/contents';

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
    const devIcon = PHASES.find((p) => p.id === 'growth')?.icon;
    const upkeepIcon = PHASES.find((p) => p.id === 'upkeep')?.icon;
    const mainIcon = PHASES.find((p) => p.id === 'main')?.icon;
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-center mb-4">Game Overview</h1>
        <p>
          Welcome to <strong>Kingdom Builder</strong>, a brisk duel of wits
          where {actionInfo.get('expand')?.icon} expansion,
          {actionInfo.get('build')?.icon} clever construction and
          {actionInfo.get('army_attack')?.icon} daring raids decide who rules
          the realm.
        </p>
        <section>
          <h2 className="text-xl font-semibold mt-4 mb-2">
            Your Objective {RESOURCES[Resource.castleHP].icon}
          </h2>
          <p>
            Keep your {RESOURCES[Resource.castleHP].icon} castle standing while
            plotting your rival's downfall. A game ends when a stronghold
            crumbles, a ruler can't sustain their realm, or the final round
            closes with one monarch ahead.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mt-4 mb-2">Turn Flow</h2>
          <p>Each round flows through three phases:</p>
          <ul className="list-disc list-inside">
            <li>
              <strong>{devIcon} Growth</strong> – your realm produces income and
              triggered effects fire.
            </li>
            <li>
              <strong>{upkeepIcon} Upkeep</strong> – pay wages and resolve
              ongoing effects.
            </li>
            <li>
              <strong>{mainIcon} Main</strong> – both players secretly queue
              actions then reveal them.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mt-4 mb-2">Resources</h2>
          <p className="mb-2">Juggle your economy to stay in power:</p>
          <ul className="list-disc list-inside">
            <li>
              {RESOURCES[Resource.gold].icon} <strong>Gold</strong> funds
              {actionInfo.get('build')?.icon} buildings and schemes.
            </li>
            <li>
              {RESOURCES[Resource.ap].icon} <strong>Action Points</strong> fuel
              every move in the {mainIcon} Main phase.
            </li>
            <li>
              {RESOURCES[Resource.happiness].icon} <strong>Happiness</strong>
              keeps the populace smiling (or rioting).
            </li>
            <li>
              {RESOURCES[Resource.castleHP].icon} <strong>Castle HP</strong> is
              your lifeline—lose it and the crown is gone.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mt-4 mb-2">
            Land &amp; Developments
          </h2>
          <p>
            Claim {landIcon} land and fill each {slotIcon} slot with
            developments. Farms grow {RESOURCES[Resource.gold].icon} gold while
            other projects unlock more slots or unique perks.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mt-4 mb-2">Population</h2>
          <p>Raise citizens and train them into specialists:</p>
          <ul className="list-disc list-inside">
            <li>
              {POPULATION_ROLES[PopulationRole.Council].icon} Council – grants
              extra {RESOURCES[Resource.ap].icon} AP each round.
            </li>
            <li>
              {POPULATION_ROLES[PopulationRole.Commander].icon} Commander –
              boosts your army for {actionInfo.get('army_attack')?.icon} raids.
            </li>
            <li>
              {POPULATION_ROLES[PopulationRole.Fortifier].icon} Fortifier –
              reinforces defenses around your castle.
            </li>
            <li>
              {POPULATION_ROLES[PopulationRole.Citizen].icon} Citizens – future
              specialists awaiting guidance.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold mt-4 mb-2">
            Actions &amp; Strategy
          </h2>
          <p className="mb-4">
            Spend {RESOURCES[Resource.ap].icon} AP on plays like
            {actionInfo.get('expand')?.icon} expanding territory,
            {actionInfo.get('develop')?.icon} developing land,
            {actionInfo.get('raise_pop')?.icon} raising population, or
            unleashing
            {actionInfo.get('army_attack')?.icon} attacks. Mix and match to
            outwit your foe!
          </p>
        </section>
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
