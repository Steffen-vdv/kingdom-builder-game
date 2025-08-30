import React from 'react';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';
import PhasePanel from './components/phases/PhasePanel';
import LogPanel from './components/LogPanel';

function GameLayout() {
  const { ctx, onExit, darkMode, onToggleDark } = useGameEngine();
  return (
    <div className="p-4 w-full bg-slate-100 text-gray-900 dark:bg-slate-900 dark:text-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-center flex-1">
          Kingdom Builder
        </h1>
        {onExit && (
          <div className="flex items-center gap-2 ml-4">
            <button
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={onToggleDark}
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={onExit}
            >
              Quit
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div
          className="flex-1 space-y-6"
          style={{ maxWidth: 'calc(100% - 31rem)' }}
        >
          <section className="border rounded bg-white dark:bg-gray-800 shadow flex">
            <div className="flex flex-1 items-stretch rounded overflow-hidden divide-x divide-black/10 dark:divide-white/10">
              {ctx.game.players.map((p, i) => {
                const isActive = p.id === ctx.activePlayer.id;
                const bgClass =
                  i === 0
                    ? isActive
                      ? 'player-bg player-bg-blue-active pr-6'
                      : 'player-bg player-bg-blue pr-6'
                    : isActive
                      ? 'player-bg player-bg-red-active pl-6'
                      : 'player-bg player-bg-red pl-6';
                return (
                  <PlayerPanel
                    key={p.id}
                    player={p}
                    className={`flex-1 p-4 ${bgClass}`}
                  />
                );
              })}
            </div>
          </section>
          <ActionsPanel />
        </div>
        <section className="w-[30rem] self-start flex flex-col gap-6">
          <PhasePanel />
          <LogPanel />
          <HoverCard />
        </section>
      </div>
    </div>
  );
}

export default function Game({
  onExit,
  darkMode = true,
  onToggleDark = () => {},
}: {
  onExit?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}) {
  return (
    <GameProvider
      {...(onExit ? { onExit } : {})}
      darkMode={darkMode}
      onToggleDark={onToggleDark}
    >
      <GameLayout />
    </GameProvider>
  );
}
