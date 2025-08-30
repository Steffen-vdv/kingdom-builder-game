import React, { useEffect, useMemo, useRef, useState } from 'react';
import { summarizeContent, describeContent, type Summary } from './translation';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';
import TimerCircle from './components/TimerCircle';
import HoverCard from './components/HoverCard';
import ActionsPanel from './components/actions/ActionsPanel';

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

  const logRef = useRef<HTMLDivElement>(null);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const phaseBoxRef = useRef<HTMLDivElement>(null);
  const [playerBoxHeight, setPlayerBoxHeight] = useState(0);
  const [phaseBoxHeight, setPhaseBoxHeight] = useState(0);
  const phaseStepsRef = useRef<HTMLUListElement>(null);
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

  useEffect(() => {
    const el = phaseStepsRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [phaseSteps]);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [log]);

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
          <section
            ref={phaseBoxRef}
            className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative w-full flex flex-col"
            onMouseEnter={() => !isActionPhase && setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            style={{
              cursor: phasePaused && !isActionPhase ? 'pause' : 'auto',
              minHeight: sharedHeight,
            }}
          >
            <div className="absolute -top-6 left-0 font-semibold">
              Turn {ctx.game.turn} - {ctx.activePlayer.name}
            </div>
            <div className="flex mb-2 border-b">
              {ctx.phases.map((p) => {
                const isSelected = displayPhase === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!tabsEnabled}
                    onClick={() => {
                      if (!tabsEnabled) return;
                      setDisplayPhase(p.id);
                      setPhaseSteps(phaseHistories[p.id] ?? []);
                    }}
                    className={`px-3 py-1 text-sm flex items-center gap-1 border-b-2 ${
                      isSelected
                        ? 'border-blue-500 font-semibold'
                        : 'border-transparent text-gray-500'
                    } ${
                      tabsEnabled
                        ? 'hover:text-gray-800 dark:hover:text-gray-200'
                        : ''
                    }`}
                  >
                    {p?.icon} {p?.label}
                  </button>
                );
              })}
            </div>
            <ul
              ref={phaseStepsRef}
              className="text-sm text-left space-y-1 overflow-y-auto flex-1"
            >
              {phaseSteps.map((s, i) => (
                <li key={i} className={s.active ? 'font-semibold' : ''}>
                  <div>{s.title}</div>
                  <ul className="pl-4 list-disc list-inside">
                    {s.items.length > 0 ? (
                      s.items.map((it, j) => (
                        <li key={j} className={it.italic ? 'italic' : ''}>
                          {it.text}
                          {it.done && (
                            <span className="text-green-600 ml-1">✔️</span>
                          )}
                        </li>
                      ))
                    ) : (
                      <li>...</li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
            {(!isActionPhase || phaseTimer > 0) && (
              <div className="absolute top-2 right-2">
                <TimerCircle progress={phaseTimer} paused={phasePaused} />
              </div>
            )}
            {isActionPhase && (
              <div className="mt-2 text-right">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={Boolean(
                    actionPhaseId &&
                      phaseHistories[actionPhaseId]?.some((s) => s.active),
                  )}
                  onClick={() => void handleEndTurn()}
                >
                  Next Turn
                </button>
              </div>
            )}
          </section>
          <div
            ref={logRef}
            className="border rounded p-4 overflow-y-auto max-h-80 bg-white dark:bg-gray-800 shadow w-full"
          >
            <h2 className="text-xl font-semibold mb-2">Log</h2>
            <ul className="mt-2 space-y-1">
              {log.map((entry, idx) => (
                <li key={idx} className="text-xs font-mono whitespace-pre-wrap">
                  [{entry.time}] {entry.text}
                </li>
              ))}
            </ul>
          </div>
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
