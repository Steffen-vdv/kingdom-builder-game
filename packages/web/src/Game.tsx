import React from 'react';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';
import PhasePanel from './components/phases/PhasePanel';
import LogPanel from './components/LogPanel';
import Button from './components/common/Button';
import TimeControl from './components/common/TimeControl';

function GameLayout() {
  const { ctx, onExit, darkMode, onToggleDark } = useGameEngine();
  return (
    <div className="p-4 w-full bg-slate-100 text-gray-900 dark:bg-slate-900 dark:text-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-center flex-1">
          Kingdom Builder
        </h1>
        {onExit && (
          <div className="flex items-center gap-3 ml-4">
            <TimeControl />
            <Button onClick={onToggleDark} variant="secondary">
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
            <Button onClick={onExit} variant="danger">
              Quit
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-x-4 gap-y-6 grid-cols-1 sm:grid-cols-1 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <section className="border rounded bg-white dark:bg-gray-800 shadow flex min-h-[275px]">
          <div className="flex flex-1 items-stretch rounded overflow-hidden divide-x divide-black/10 dark:divide-white/10">
            {ctx.game.players.map((p, i) => {
              const isActive = p.id === ctx.activePlayer.id;
              const sideClass = i === 0 ? 'pr-6' : 'pl-6';
              const colorClass =
                i === 0
                  ? isActive
                    ? 'player-bg-blue-active'
                    : 'player-bg-blue'
                  : isActive
                    ? 'player-bg-red-active'
                    : 'player-bg-red';
              const bgClass = [
                'player-bg',
                sideClass,
                colorClass,
                isActive ? 'player-bg-animated' : null,
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <PlayerPanel
                  key={p.id}
                  player={p}
                  className={`flex-1 p-4 ${bgClass}`}
                  isActive={isActive}
                />
              );
            })}
          </div>
        </section>
        <div className="w-full lg:col-start-2">
          <PhasePanel />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <ActionsPanel />
        </div>
        <div className="w-full flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <LogPanel />
          <HoverCard />
        </div>
      </div>
    </div>
  );
}

export default function Game({
  onExit,
  darkMode = true,
  onToggleDark = () => {},
  devMode = false,
}: {
  onExit?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
  devMode?: boolean;
}) {
  return (
    <GameProvider
      {...(onExit ? { onExit } : {})}
      darkMode={darkMode}
      onToggleDark={onToggleDark}
      devMode={devMode}
    >
      <GameLayout />
    </GameProvider>
  );
}
