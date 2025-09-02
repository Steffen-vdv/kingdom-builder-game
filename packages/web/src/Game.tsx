import React from 'react';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';
import PhasePanel from './components/phases/PhasePanel';
import LogPanel from './components/LogPanel';
import Button from './components/common/Button';
import Tooltip from './components/common/Tooltip';
import HelpModal from './components/HelpModal';

function GameLayout() {
  const { ctx, onExit, darkMode, onToggleDark } = useGameEngine();
  const [helpOpen, setHelpOpen] = React.useState(false);
  return (
    <div className="p-4 w-full bg-slate-100 text-gray-900 dark:bg-slate-900 dark:text-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-center flex-1">
          Kingdom Builder
        </h1>
        <div className="flex items-center gap-2 ml-4">
          <Tooltip content="Game overview">
            <Button
              variant="ghost"
              onClick={() => setHelpOpen(true)}
              aria-label="Show help"
            >
              ?
            </Button>
          </Tooltip>
          {onExit && (
            <>
              <Button onClick={onToggleDark} variant="secondary">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </Button>
              <Button onClick={onExit} variant="danger">
                Quit
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-6 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_30rem]">
        <section className="border rounded bg-white dark:bg-gray-800 shadow flex min-h-[275px]">
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
        <div className="w-full lg:w-[30rem] lg:col-start-2">
          <PhasePanel />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
          <ActionsPanel />
        </div>
        <div className="w-full lg:w-[30rem] flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
          <LogPanel />
          <HoverCard />
        </div>
      </div>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
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
