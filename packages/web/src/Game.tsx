import React, { useEffect, useMemo, useRef, useState } from 'react';
import { summarizeContent, describeContent, type Summary } from './translation';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';
import PhasePanel from './components/phases/PhasePanel';
import LogPanel from './components/LogPanel';

interface Action {
  id: string;
  name: string;
  system?: boolean;
}
interface Development {
  id: string;
  name: string;
  system?: boolean;
}
interface Building {
  id: string;
  name: string;
}

export function isActionPhaseActive(
  currentPhase: string,
  actionPhaseId: string | undefined,
  tabsEnabled: boolean,
): boolean {
  return tabsEnabled && currentPhase === actionPhaseId;
}

function GameInner({
  onExit,
  darkMode = true,
  onToggleDark = () => {},
}: {
  onExit?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}) {
  const {
    ctx,
    log,
    hoverCard,
    phaseSteps,
    setPhaseSteps,
    phaseTimer,
    phasePaused,
    setPaused,
    mainApStart,
    displayPhase,
    setDisplayPhase,
    phaseHistories,
    tabsEnabled,
    runUntilActionPhase,
    handleEndTurn,
    updateMainPhaseStep,
  } = useGameEngine();

  const playerBoxRef = useRef<HTMLDivElement>(null);
  const phaseBoxRef = useRef<HTMLDivElement>(null);
  const [playerBoxHeight, setPlayerBoxHeight] = useState(0);
  const [phaseBoxHeight, setPhaseBoxHeight] = useState(0);
  const actionPhaseId = useMemo(
    () => ctx.phases.find((p) => p.action)?.id,
    [ctx],
  );
  const isActionPhase = isActionPhaseActive(
    ctx.game.currentPhase,
    actionPhaseId,
    tabsEnabled,
  );

  useEffect(() => {
    const pEl = playerBoxRef.current;
    const phEl = phaseBoxRef.current;
    if (!pEl || !phEl) return;
    const update = () => {
      setPlayerBoxHeight(pEl.offsetHeight);
      setPhaseBoxHeight(phEl.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(pEl);
    ro.observe(phEl);
    return () => ro.disconnect();
  }, []);

  const sharedHeight = Math.max(playerBoxHeight, phaseBoxHeight, 275);

  const actions = useMemo<Action[]>(
    () =>
      Array.from(
        (ctx.actions as unknown as { map: Map<string, Action> }).map.values(),
      ).filter((a) => !a.system || ctx.activePlayer.actions.has(a.id)),
    [ctx, ctx.activePlayer.actions.size],
  );
  const developmentOptions = useMemo<Development[]>(
    () =>
      Array.from(
        (
          ctx.developments as unknown as { map: Map<string, Development> }
        ).map.values(),
      ).filter((d) => !d.system),
    [ctx],
  );
  const developmentOrder = ['house', 'farm', 'outpost', 'watchtower'];
  const sortedDevelopments = useMemo(
    () =>
      developmentOrder
        .map((id) => developmentOptions.find((d) => d.id === id))
        .filter(Boolean) as Development[],
    [developmentOptions],
  );
  const buildingOptions = useMemo<Building[]>(
    () =>
      Array.from(
        (
          ctx.buildings as unknown as { map: Map<string, Building> }
        ).map.values(),
      ),
    [ctx],
  );

  const actionSummaries = useMemo(() => {
    const map = new Map<string, Summary>();
    actions.forEach((a) =>
      map.set(a.id, summarizeContent('action', a.id, ctx)),
    );
    return map;
  }, [actions, ctx]);
  const developmentSummaries = useMemo(() => {
    const map = new Map<string, Summary>();
    sortedDevelopments.forEach((d) =>
      map.set(d.id, summarizeContent('development', d.id, ctx)),
    );
    return map;
  }, [sortedDevelopments, ctx]);
  const buildingSummaries = useMemo(() => {
    const map = new Map<string, Summary>();
    buildingOptions.forEach((b) =>
      map.set(b.id, summarizeContent('building', b.id, ctx)),
    );
    return map;
  }, [buildingOptions, ctx]);
  const buildingDescriptions = useMemo(() => {
    const map = new Map<string, Summary>();
    buildingOptions.forEach((b) =>
      map.set(b.id, describeContent('building', b.id, ctx)),
    );
    return map;
  }, [buildingOptions, ctx]);
  const buildingInstalledDescriptions = useMemo(() => {
    const map = new Map<string, Summary>();
    buildingOptions.forEach((b) =>
      map.set(
        b.id,
        describeContent('building', b.id, ctx, { installed: true }),
      ),
    );
    return map;
  }, [buildingOptions, ctx]);

  const hasDevelopLand = ctx.activePlayer.lands.some((l) => l.slotsFree > 0);
  const developAction = actions.find((a) => a.id === 'develop');
  const buildAction = actions.find((a) => a.id === 'build');
  const raisePopAction = actions.find((a) => a.id === 'raise_pop');
  const otherActions = actions.filter(
    (a) => a.id !== 'develop' && a.id !== 'build' && a.id !== 'raise_pop',
  );

  useEffect(() => {
    void runUntilActionPhase();
  }, []);

  useEffect(() => {
    if (isActionPhase && (mainApStart !== 0 || ctx.activePlayer.ap === 0)) {
      updateMainPhaseStep();
    }
  }, [isActionPhase, ctx.activePlayer.ap, mainApStart]);

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
          <section
            ref={playerBoxRef}
            className="border rounded bg-white dark:bg-gray-800 shadow flex"
            style={{ minHeight: sharedHeight }}
          >
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
                    buildingDescriptions={buildingInstalledDescriptions}
                  />
                );
              })}
            </div>
          </section>
          <ActionsPanel
            isActionPhase={isActionPhase}
            otherActions={otherActions}
            raisePopAction={raisePopAction}
            developAction={developAction}
            buildAction={buildAction}
            hasDevelopLand={hasDevelopLand}
            sortedDevelopments={sortedDevelopments}
            buildingOptions={buildingOptions}
            actionSummaries={actionSummaries}
            developmentSummaries={developmentSummaries}
            buildingSummaries={buildingSummaries}
            buildingDescriptions={buildingDescriptions}
          />
        </div>
        <section className="w-[30rem] self-start flex flex-col gap-6">
          <PhasePanel
            ref={phaseBoxRef}
            turn={ctx.game.turn}
            activePlayerName={ctx.activePlayer.name}
            phases={ctx.phases}
            phaseSteps={phaseSteps}
            setPhaseSteps={setPhaseSteps}
            phaseTimer={phaseTimer}
            phasePaused={phasePaused}
            setPaused={setPaused}
            displayPhase={displayPhase}
            setDisplayPhase={setDisplayPhase}
            phaseHistories={phaseHistories}
            tabsEnabled={tabsEnabled}
            isActionPhase={isActionPhase}
            actionPhaseId={actionPhaseId}
            handleEndTurn={handleEndTurn}
            sharedHeight={sharedHeight}
          />
          <LogPanel entries={log} />
          <HoverCard data={hoverCard} />
        </section>
      </div>
    </div>
  );
}

export default function Game(props: {
  onExit?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}) {
  return (
    <GameProvider>
      <GameInner {...props} />
    </GameProvider>
  );
}
