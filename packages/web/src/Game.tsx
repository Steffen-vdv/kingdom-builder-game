import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createEngine,
  performAction,
  runEffects,
  collectTriggerEffects,
  Phase,
  getActionCosts,
  getActionRequirements,
  Resource,
  PopulationRole,
  RESOURCES,
  STATS,
  POPULATION_ROLES,
} from '@kingdom-builder/engine';
import type {
  EngineContext,
  ActionParams,
  ResourceKey,
} from '@kingdom-builder/engine';
import {
  actionInfo,
  developmentInfo,
  landIcon,
  slotIcon,
  buildingIcon,
  phaseInfo,
} from './icons';
import {
  summarizeContent,
  describeContent,
  snapshotPlayer,
  diffSnapshots,
  logContent,
  type Summary,
} from './translation';

interface Action {
  id: string;
  name: string;
  system?: boolean;
}
interface Development {
  id: string;
  name: string;
}
interface Building {
  id: string;
  name: string;
}

function renderSummary(summary: Summary | undefined): React.ReactNode {
  return summary?.map((e, i) =>
    typeof e === 'string' ? (
      <li key={i} className="whitespace-pre-line">
        {e}
      </li>
    ) : (
      <li key={i}>
        <span className="font-semibold">{e.title}</span>
        <ul className="list-disc pl-4">{renderSummary(e.items)}</ul>
      </li>
    ),
  );
}

interface PlayerPanelProps {
  player: EngineContext['activePlayer'];
  ctx: EngineContext;
  handleHoverCard: (data: {
    title: string;
    effects: Summary;
    requirements: string[];
    costs: Record<string, number>;
    description?: string;
    descriptionClass?: string;
    effectsTitle?: string;
    bgClass?: string;
  }) => void;
  clearHoverCard: () => void;
  className?: string;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  ctx,
  handleHoverCard,
  clearHoverCard,
  className = '',
}) => {
  const popEntries = Object.entries(player.population).filter(([, v]) => v > 0);
  const currentPop = popEntries.reduce((sum, [, v]) => sum + v, 0);
  const popDetails = popEntries.map(([role, count]) => ({ role, count }));
  function formatStatValue(key: string, value: number) {
    if (key === 'absorption') return `${value * 100}%`;
    return String(value);
  }
  const showPopulationCard = () =>
    handleHoverCard({
      title: '👥 Population',
      effects: Object.values(POPULATION_ROLES).map(
        (r) => `${r.icon} ${r.label} - ${r.description}`,
      ),
      effectsTitle: 'Archetypes',
      requirements: [],
      costs: {},
      description:
        'Population represents the people of your kingdom. Manage them wisely and assign roles to benefit your realm.',
      bgClass: 'bg-gray-100 dark:bg-gray-700',
    });

  return (
    <div className={`space-y-1 w-fit ${className}`}>
      <h3 className="font-semibold">{player.name}</h3>
      <div className="flex flex-wrap items-center gap-2 border p-2 rounded w-fit">
        {Object.entries(player.resources).map(([k, v]) => {
          const info = RESOURCES[k as keyof typeof RESOURCES];
          return (
            <span
              key={k}
              className="bar-item transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help"
              onMouseEnter={() =>
                handleHoverCard({
                  title: `${info.icon} ${info.label}`,
                  effects: [],
                  requirements: [],
                  costs: {},
                  description: info.description,
                  bgClass: 'bg-gray-100 dark:bg-gray-700',
                })
              }
              onMouseLeave={clearHoverCard}
            >
              {info.icon}
              {v}
            </span>
          );
        })}
        <div className="h-4 border-l" />
        <span
          className="bar-item transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help"
          onMouseEnter={showPopulationCard}
          onMouseLeave={clearHoverCard}
        >
          👥{currentPop}/{player.maxPopulation}
          {popDetails.length > 0 && (
            <>
              {' ('}
              {popDetails.map(({ role, count }, i) => {
                const info =
                  POPULATION_ROLES[role as keyof typeof POPULATION_ROLES];
                return (
                  <React.Fragment key={role}>
                    {i > 0 && ','}
                    <span
                      className="cursor-help transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105"
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        handleHoverCard({
                          title: `${info.icon} ${info.label}`,
                          effects: [],
                          requirements: [],
                          costs: {},
                          description: info.description,
                          bgClass: 'bg-gray-100 dark:bg-gray-700',
                        });
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        showPopulationCard();
                      }}
                    >
                      {info.icon}
                      {count}
                    </span>
                  </React.Fragment>
                );
              })}
              {')'}
            </>
          )}
        </span>
        {Object.entries(player.stats)
          .filter(([k]) => k !== 'maxPopulation')
          .map(([k, v]) => {
            const info = STATS[k as keyof typeof STATS];
            return (
              <span
                key={k}
                className="bar-item transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help"
                onMouseEnter={() =>
                  handleHoverCard({
                    title: `${info.icon} ${info.label}`,
                    effects: [],
                    requirements: [],
                    costs: {},
                    description: info.description,
                    bgClass: 'bg-gray-100 dark:bg-gray-700',
                  })
                }
                onMouseLeave={clearHoverCard}
              >
                {info.icon}
                {formatStatValue(k, v)}
              </span>
            );
          })}
      </div>
      {player.lands.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 w-fit">
          {player.lands.map((land, idx) => {
            const showLandCard = () =>
              handleHoverCard({
                title: `${landIcon} Land`,
                effects: describeContent('land', land, ctx),
                requirements: [],
                costs: {},
                effectsTitle: 'Developments',
                bgClass: 'bg-gray-100 dark:bg-gray-700',
              });
            return (
              <div
                key={idx}
                className="relative border p-2 text-center transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help"
                onMouseEnter={showLandCard}
                onMouseLeave={clearHoverCard}
              >
                <span className="font-medium">{landIcon} Land</span>
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {Array.from({ length: land.slotsMax }).map((_, i) => {
                    const devId = land.developments[i];
                    if (devId) {
                      const name = ctx.developments.get(devId)?.name || devId;
                      const title = `${developmentInfo[devId]?.icon || ''} ${name}`;
                      const handleLeave = () => showLandCard();
                      return (
                        <span
                          key={i}
                          className="border p-1 text-xs transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            handleHoverCard({
                              title,
                              effects: describeContent(
                                'development',
                                devId,
                                ctx,
                                {
                                  installed: true,
                                },
                              ),
                              requirements: [],
                              costs: {},
                              bgClass: 'bg-gray-100 dark:bg-gray-700',
                            });
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            handleLeave();
                          }}
                        >
                          {developmentInfo[devId]?.icon} {name}
                        </span>
                      );
                    }
                    const handleLeave = () => showLandCard();
                    return (
                      <span
                        key={i}
                        className="border p-1 text-xs transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help whitespace-nowrap"
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          handleHoverCard({
                            title: `${slotIcon} Development Slot (empty)`,
                            effects: [],
                            description: `Use ${actionInfo.develop.icon} Develop to build here`,
                            requirements: [],
                            costs: {},
                            bgClass: 'bg-gray-100 dark:bg-gray-700',
                          });
                        }}
                        onMouseLeave={(e) => {
                          e.stopPropagation();
                          handleLeave();
                        }}
                      >
                        {slotIcon} Development Slot (empty)
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {player.buildings.size > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 w-fit">
          {Array.from(player.buildings).map((b) => {
            const name = ctx.buildings.get(b)?.name || b;
            const title = `${buildingIcon} ${name}`;
            return (
              <div
                key={b}
                className="border p-2 text-center transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 cursor-help"
                onMouseEnter={() =>
                  handleHoverCard({
                    title,
                    effects: describeContent('building', b, ctx, {
                      installed: true,
                    }),
                    requirements: [],
                    costs: {},
                    bgClass: 'bg-gray-100 dark:bg-gray-700',
                  })
                }
                onMouseLeave={clearHoverCard}
              >
                <span className="font-medium">
                  {buildingIcon} {name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion */

function renderCosts(
  costs: Record<string, number>,
  resources: Record<string, number>,
) {
  const entries = Object.entries(costs).filter(([k]) => k !== Resource.ap);
  if (entries.length === 0)
    return (
      <span className="mr-1 text-gray-400 dark:text-gray-500 italic">Free</span>
    );
  return (
    <>
      {entries.map(([k, v]) => (
        <span
          key={k}
          className={`mr-1 ${(resources[k] ?? 0) < v ? 'text-red-500' : ''}`}
        >
          {RESOURCES[k as ResourceKey]?.icon}
          {v}
        </span>
      ))}
    </>
  );
}

function TimerCircle({
  progress,
  paused = false,
}: {
  progress: number;
  paused?: boolean;
}) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  if (paused)
    return (
      <svg width={24} height={24} viewBox="0 0 24 24">
        <rect x="6" y="4" width="4" height="16" fill="#10b981" />
        <rect x="14" y="4" width="4" height="16" fill="#10b981" />
      </svg>
    );
  return (
    <svg width={24} height={24}>
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="#e5e7eb"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={(1 - progress) * circumference}
      />
    </svg>
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
  const ctx = useMemo<EngineContext>(() => {
    const c = createEngine();
    return c;
  }, []);

  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [log, setLog] = useState<{ time: string; text: string }[]>([]);
  const [hoverCard, setHoverCard] = useState<{
    title: string;
    effects: Summary;
    requirements: string[];
    costs: Record<string, number>;
    description?: string;
    descriptionClass?: string;
    effectsTitle?: string;
    bgClass?: string;
  } | null>(null);
  const hoverTimeout = useRef<number>();
  const [phaseSteps, setPhaseSteps] = useState<
    {
      title: string;
      items: { text: string; italic?: boolean; done?: boolean }[];
      active: boolean;
    }[]
  >([]);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [phasePaused, setPhasePaused] = useState(false);
  const phasePausedRef = useRef(false);
  const [mainApStart, setMainApStart] = useState(0);
  const playerBoxRef = useRef<HTMLDivElement>(null);
  const [playerBoxHeight, setPlayerBoxHeight] = useState(0);
  const phaseStepsRef = useRef<HTMLUListElement>(null);

  function setPaused(v: boolean) {
    phasePausedRef.current = v;
    setPhasePaused(v);
  }

  function formatRequirement(req: string): string {
    return req;
  }

  const addLog = (entry: string | string[], playerName?: string) =>
    setLog((prev) => [
      ...(Array.isArray(entry) ? entry : [entry]).map((text) => ({
        time: new Date().toLocaleTimeString(),
        text: `[${playerName ?? ctx.activePlayer.name}] ${text}`,
      })),
      ...prev,
    ]);

  function handleHoverCard(data: {
    title: string;
    effects: Summary;
    requirements: string[];
    costs: Record<string, number>;
    description?: string;
    descriptionClass?: string;
    effectsTitle?: string;
    bgClass?: string;
  }) {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    hoverTimeout.current = window.setTimeout(() => setHoverCard(data), 300);
  }
  function clearHoverCard() {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current);
    setHoverCard(null);
  }

  const actions = useMemo<Action[]>(
    () =>
      Array.from(
        (ctx.actions as unknown as { map: Map<string, Action> }).map.values(),
      ).filter((a) => !a.system),
    [ctx],
  );
  const developmentOptions = useMemo<Development[]>(
    () =>
      Array.from(
        (
          ctx.developments as unknown as { map: Map<string, Development> }
        ).map.values(),
      ),
    [ctx],
  );
  const developmentOrder = ['house', 'farm', 'outpost', 'watchtower', 'garden'];
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

  useEffect(() => {
    const el = playerBoxRef.current;
    if (!el) return;
    const update = () => setPlayerBoxHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = phaseStepsRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [phaseSteps]);

  const hasDevelopLand = ctx.activePlayer.lands.some((l) => l.slotsFree > 0);
  const developAction = actions.find((a) => a.id === 'develop');
  const buildAction = actions.find((a) => a.id === 'build');
  const raisePopAction = actions.find((a) => a.id === 'raise_pop');
  const otherActions = actions.filter(
    (a) => a.id !== 'develop' && a.id !== 'build' && a.id !== 'raise_pop',
  );

  function handlePerform(action: Action, params?: Record<string, unknown>) {
    const before = snapshotPlayer(ctx.activePlayer);
    try {
      performAction(action.id, ctx, params as ActionParams<string>);
      const after = snapshotPlayer(ctx.activePlayer);
      const changes = diffSnapshots(before, after, ctx);
      const messages = logContent('action', action.id, ctx, params);
      addLog([...messages, ...changes.map((c) => `  ${c}`)]);
    } catch (e) {
      const icon = actionInfo[action.id as keyof typeof actionInfo]?.icon || '';
      addLog(`Failed to play ${icon} ${action.name}: ${(e as Error).message}`);
    }
    refresh();
  }

  function runDelay(total: number) {
    setPhaseTimer(0);
    return new Promise<void>((resolve) => {
      let elapsed = 0;
      const step = 100;
      const interval = window.setInterval(() => {
        if (!phasePausedRef.current) {
          elapsed += step;
          setPhaseTimer(elapsed / total);
          if (elapsed >= total) {
            window.clearInterval(interval);
            resolve();
          }
        }
      }, step);
    });
  }

  function runPhaseDelay() {
    return runDelay(2000);
  }

  function runStepDelay() {
    return runDelay(1000);
  }

  function updateMainPhaseStep(apStartOverride?: number) {
    const total = apStartOverride ?? mainApStart;
    const spent = total - ctx.activePlayer.ap;
    setPhaseSteps([
      {
        title: 'Step 1 - Spend all AP',
        items: [
          {
            text: `${RESOURCES[Resource.ap].icon} ${spent}/${total} spent`,
            done: ctx.activePlayer.ap === 0,
          },
        ],
        active: ctx.activePlayer.ap > 0,
      },
    ]);
  }

  async function runPhaseForPlayer(
    trigger: 'onDevelopmentPhase' | 'onUpkeepPhase',
    index: number,
  ) {
    ctx.game.currentPlayerIndex = index;
    const player = ctx.activePlayer;
    const effects = collectTriggerEffects(trigger, ctx, player);

    const developmentSteps = [
      {
        title: 'Gain Income',
        classify: (change: string) =>
          change.includes(RESOURCES[Resource.gold].icon) ||
          change.includes(RESOURCES[Resource.happiness].icon),
      },
      {
        title: 'Generate Action Points',
        classify: (change: string) =>
          change.includes(RESOURCES[Resource.ap].icon),
      },
      {
        title: 'Grow Strengths',
        classify: (change: string) =>
          change.includes(STATS['armyStrength'].icon) ||
          change.includes(STATS['fortificationStrength'].icon),
      },
    ] as const;

    const upkeepSteps = [
      {
        title: 'Pay Upkeep',
        classify: (change: string) =>
          change.includes(RESOURCES[Resource.gold].icon),
      },
      {
        title: 'Check Shortfall',
        classify: () => false,
      },
      {
        title: 'End-of-Upkeep triggers',
        classify: () => true,
      },
    ] as const;

    const stepDefs =
      trigger === 'onDevelopmentPhase' ? developmentSteps : upkeepSteps;
    const stepItems = stepDefs.map(
      () => [] as { text: string; italic?: boolean; done?: boolean }[],
    );

    const phaseChanges: string[] = [];
    for (const effect of effects) {
      const before = snapshotPlayer(player);
      runEffects([effect], ctx);
      const after = snapshotPlayer(player);
      const changes = diffSnapshots(before, after, ctx);
      phaseChanges.push(...changes);
      for (const change of changes) {
        let idx = stepDefs.findIndex((s) => s.classify(change));
        if (idx === -1) idx = stepDefs.length - 1;
        stepItems[idx]!.push({ text: change });
      }
    }
    if (phaseChanges.length) {
      const info = phaseInfo[trigger];
      addLog(
        [`${info.icon} ${info.past}:`, ...phaseChanges.map((c) => `  ${c}`)],
        player.name,
      );
    }

    if (trigger === 'onDevelopmentPhase') {
      const commanders = player.population[PopulationRole.Commander] || 0;
      const fortifiers = player.population[PopulationRole.Fortifier] || 0;
      if (stepItems[2]!.length === 0) {
        stepItems[2]!.push({
          text: `${POPULATION_ROLES[PopulationRole.Commander].icon}${commanders} - No effect`,
          italic: true,
        });
        stepItems[2]!.push({
          text: `${POPULATION_ROLES[PopulationRole.Fortifier].icon}${fortifiers} - No effect`,
          italic: true,
        });
      }
    } else if (trigger === 'onUpkeepPhase') {
      if (stepItems[0]!.length === 0)
        stepItems[0]!.push({ text: 'No costs to pay', italic: true });
      if (stepItems[1]!.length === 0)
        stepItems[1]!.push({ text: 'No shortfall', italic: true });
      if (stepItems[2]!.length === 0)
        stepItems[2]!.push({ text: 'No effects', italic: true });
    }

    setPhaseSteps([]);
    for (let i = 0; i < stepDefs.length; i++) {
      setPhaseSteps((prev) => [
        ...prev,
        {
          title: `Step ${i + 1} - ${stepDefs[i]!.title}`,
          items: [],
          active: true,
        },
      ]);
      const items =
        stepItems[i]!.length > 0
          ? stepItems[i]!
          : [{ text: 'No effect', italic: true }];
      for (const item of items) {
        setPhaseSteps((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i]!,
            items: [...next[i]!.items, item],
          };
          return next;
        });
      }
      await runStepDelay();
      setPhaseSteps((prev) => {
        const next = [...prev];
        next[i] = { ...next[i]!, active: false };
        return next;
      });
    }
  }

  async function startTurn(playerIndex: number) {
    ctx.game.currentPlayerIndex = playerIndex;
    ctx.game.currentPhase = Phase.Development;
    refresh();
    await runPhaseForPlayer('onDevelopmentPhase', playerIndex);
    await runPhaseDelay();
    ctx.game.currentPhase = Phase.Upkeep;
    refresh();
    await runPhaseForPlayer('onUpkeepPhase', playerIndex);
    await runPhaseDelay();
    ctx.game.currentPhase = Phase.Main;
    setMainApStart(ctx.activePlayer.ap);
    updateMainPhaseStep(ctx.activePlayer.ap);
    refresh();
  }

  async function handleEndTurn() {
    if (ctx.game.currentPhase !== Phase.Main) return;
    if (ctx.activePlayer.ap > 0) return;
    const last = ctx.game.currentPlayerIndex === ctx.game.players.length - 1;
    if (last) {
      ctx.game.turn += 1;
      await startTurn(0);
    } else {
      await startTurn(ctx.game.currentPlayerIndex + 1);
    }
  }

  useEffect(() => {
    void startTurn(0);
  }, []);

  useEffect(() => {
    if (ctx.game.currentPhase === Phase.Main) updateMainPhaseStep();
  }, [ctx.game.currentPhase, ctx.activePlayer.ap]);

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
            className="border rounded p-4 bg-white dark:bg-gray-800 shadow"
          >
            <div className="flex items-start gap-4">
              {ctx.game.players.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && <div className="w-px bg-gray-300 self-stretch" />}
                  <PlayerPanel
                    player={p}
                    ctx={ctx}
                    handleHoverCard={handleHoverCard}
                    clearHoverCard={clearHoverCard}
                    className={`p-2 rounded ${
                      i === 0
                        ? 'bg-blue-50 dark:bg-blue-900/40'
                        : 'bg-red-50 dark:bg-red-900/40'
                    }`}
                  />
                </React.Fragment>
              ))}
            </div>
          </section>
          <section className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative">
            {ctx.game.currentPhase !== Phase.Main && (
              <div className="absolute inset-0 bg-gray-200/60 dark:bg-gray-900/60 rounded pointer-events-none" />
            )}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">
                Actions (1 {RESOURCES[Resource.ap].icon} each)
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {otherActions.map((action) => {
                  const costs = getActionCosts(action.id, ctx);
                  const requirements = getActionRequirements(
                    action.id,
                    ctx,
                  ).map(formatRequirement);
                  const canPay = Object.entries(costs).every(
                    ([k, v]) =>
                      ctx.activePlayer.resources[
                        k as keyof typeof ctx.activePlayer.resources
                      ] >= v,
                  );
                  const meetsReq = requirements.length === 0;
                  const summary = actionSummaries.get(action.id);
                  const implemented = (summary?.length ?? 0) > 0; // TODO: implement action effects
                  const enabled =
                    canPay &&
                    meetsReq &&
                    ctx.game.currentPhase === Phase.Main &&
                    implemented;
                  const title = !implemented
                    ? 'Not implemented yet'
                    : !meetsReq
                      ? requirements.join(', ')
                      : !canPay
                        ? 'Cannot pay costs'
                        : ctx.game.currentPhase !== Phase.Main
                          ? 'Not in Main phase'
                          : undefined;
                  return (
                    <button
                      key={action.id}
                      className={`relative border p-3 flex flex-col items-start gap-2 h-full transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 hover:cursor-help ${
                        enabled ? '' : 'opacity-50 cursor-not-allowed'
                      }`}
                      title={title}
                      onClick={() => enabled && handlePerform(action)}
                      onMouseEnter={() =>
                        handleHoverCard({
                          title: `${
                            actionInfo[action.id as keyof typeof actionInfo]
                              ?.icon || ''
                          } ${action.name}`,
                          effects: describeContent('action', action.id, ctx),
                          requirements,
                          costs,
                          ...(!implemented && {
                            description: 'Not implemented yet',
                            descriptionClass: 'italic text-red-600',
                          }),
                          bgClass: 'bg-gray-100 dark:bg-gray-700',
                        })
                      }
                      onMouseLeave={clearHoverCard}
                    >
                      <span className="text-base font-medium">
                        {actionInfo[action.id as keyof typeof actionInfo]?.icon}{' '}
                        {action.name}
                      </span>
                      <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                        {renderCosts(costs, ctx.activePlayer.resources)}
                      </span>
                      <ul className="text-sm list-disc pl-4 text-left">
                        {implemented ? (
                          renderSummary(summary)
                        ) : (
                          <li className="italic text-red-600">
                            Not implemented yet
                          </li>
                        )}
                      </ul>
                      {requirements.length > 0 && (
                        <div className="text-sm text-red-600 text-left">
                          <span className="font-semibold">Requirements</span>
                          <ul className="list-disc pl-4">
                            {requirements.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {raisePopAction && (
                <div>
                  <h3 className="font-medium">
                    {actionInfo.raise_pop.icon} Raise Population
                  </h3>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      PopulationRole.Council,
                      PopulationRole.Commander,
                      PopulationRole.Fortifier,
                    ].map((role) => {
                      const costs = getActionCosts('raise_pop', ctx);
                      const requirements = getActionRequirements(
                        'raise_pop',
                        ctx,
                      ).map(formatRequirement);
                      const canPay = Object.entries(costs).every(
                        ([k, v]) =>
                          ctx.activePlayer.resources[
                            k as keyof typeof ctx.activePlayer.resources
                          ] >= v,
                      );
                      const meetsReq = requirements.length === 0;
                      const enabled =
                        canPay &&
                        meetsReq &&
                        ctx.game.currentPhase === Phase.Main;
                      const title = !meetsReq
                        ? requirements.join(', ')
                        : !canPay
                          ? 'Cannot pay costs'
                          : ctx.game.currentPhase !== Phase.Main
                            ? 'Not in Main phase'
                            : undefined;
                      const summary = describeContent(
                        'action',
                        'raise_pop',
                        ctx,
                      );
                      const shortSummary = summarizeContent(
                        'action',
                        'raise_pop',
                        ctx,
                      );
                      const first = summary[0];
                      if (first && typeof first !== 'string') {
                        first.items.push(
                          `👥(${POPULATION_ROLES[role]?.icon}) +1`,
                        );
                      }
                      const shortFirst = shortSummary[0];
                      if (shortFirst && typeof shortFirst !== 'string') {
                        shortFirst.items.push(
                          `👥(${POPULATION_ROLES[role]?.icon}) +1`,
                        );
                      }
                      return (
                        <button
                          key={role}
                          className={`relative border p-3 flex flex-col items-start gap-2 h-full transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 hover:cursor-help ${
                            enabled ? '' : 'opacity-50 cursor-not-allowed'
                          }`}
                          title={title}
                          onClick={() =>
                            enabled && handlePerform(raisePopAction, { role })
                          }
                          onMouseEnter={() =>
                            handleHoverCard({
                              title: `${actionInfo.raise_pop.icon} Raise Population - ${
                                POPULATION_ROLES[role]?.icon
                              } ${POPULATION_ROLES[role]?.label || ''}`,
                              effects: summary,
                              requirements,
                              costs,
                              bgClass: 'bg-gray-100 dark:bg-gray-700',
                            })
                          }
                          onMouseLeave={clearHoverCard}
                        >
                          <span className="text-base font-medium">
                            {POPULATION_ROLES[role]?.icon}{' '}
                            {POPULATION_ROLES[role]?.label}
                          </span>
                          <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                            {renderCosts(costs, ctx.activePlayer.resources)}
                          </span>
                          <ul className="text-sm list-disc pl-4 text-left">
                            {renderSummary(shortSummary)}
                          </ul>
                          {requirements.length > 0 && (
                            <div className="text-sm text-red-600 text-left">
                              <span className="font-semibold">
                                Requirements
                              </span>
                              <ul className="list-disc pl-4">
                                {requirements.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {developAction && (
                <div>
                  <h3 className="font-medium">
                    {actionInfo.develop.icon} Develop
                  </h3>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {sortedDevelopments.map((d) => {
                      const landIdForCost = ctx.activePlayer.lands[0]
                        ?.id as string;
                      const costs = getActionCosts('develop', ctx, {
                        id: d.id,
                        landId: landIdForCost,
                      });
                      const requirements = hasDevelopLand
                        ? []
                        : ['Requires land with free development slot'];
                      const canPay =
                        hasDevelopLand &&
                        Object.entries(costs).every(
                          ([k, v]) =>
                            ctx.activePlayer.resources[
                              k as keyof typeof ctx.activePlayer.resources
                            ] >= v,
                        );
                      const summary = developmentSummaries.get(d.id);
                      const implemented = (summary?.length ?? 0) > 0; // TODO: implement development effects
                      const enabled =
                        canPay &&
                        ctx.game.currentPhase === Phase.Main &&
                        implemented;
                      const title = !implemented
                        ? 'Not implemented yet'
                        : !hasDevelopLand
                          ? 'No land with free development slot'
                          : !canPay
                            ? 'Cannot pay costs'
                            : ctx.game.currentPhase !== Phase.Main
                              ? 'Not in Main phase'
                              : undefined;
                      return (
                        <button
                          key={d.id}
                          className={`relative border p-3 flex flex-col items-start gap-2 h-full transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 hover:cursor-help ${
                            enabled ? '' : 'opacity-50 cursor-not-allowed'
                          }`}
                          title={title}
                          onClick={() => {
                            if (!enabled) return;
                            const landId = ctx.activePlayer.lands.find(
                              (l) => l.slotsFree > 0,
                            )?.id;
                            handlePerform(developAction, { id: d.id, landId });
                          }}
                          onMouseEnter={() =>
                            handleHoverCard({
                              title: `${actionInfo.develop.icon} Develop - ${
                                developmentInfo[d.id]?.icon
                              } ${d.name}`,
                              effects: describeContent(
                                'development',
                                d.id,
                                ctx,
                              ),
                              requirements,
                              costs,
                              ...(!implemented && {
                                description: 'Not implemented yet',
                                descriptionClass: 'italic text-red-600',
                              }),
                              bgClass: 'bg-gray-100 dark:bg-gray-700',
                            })
                          }
                          onMouseLeave={clearHoverCard}
                        >
                          <span className="text-base font-medium">
                            {developmentInfo[d.id]?.icon} {d.name}
                          </span>
                          <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                            {renderCosts(costs, ctx.activePlayer.resources)}
                          </span>
                          <ul className="text-sm list-disc pl-4 text-left">
                            {implemented ? (
                              renderSummary(summary)
                            ) : (
                              <li className="italic text-red-600">
                                Not implemented yet
                              </li>
                            )}
                          </ul>
                          {requirements.length > 0 && (
                            <div className="text-sm text-red-600 text-left">
                              <span className="font-semibold">
                                Requirements
                              </span>
                              <ul className="list-disc pl-4">
                                {requirements.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {buildAction && (
                <div>
                  <h3 className="font-medium">{actionInfo.build.icon} Build</h3>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {buildingOptions.map((b) => {
                      const costs = getActionCosts('build', ctx, { id: b.id });
                      const requirements: string[] = [];
                      const canPay = Object.entries(costs).every(
                        ([k, v]) =>
                          ctx.activePlayer.resources[
                            k as keyof typeof ctx.activePlayer.resources
                          ] >= v,
                      );
                      const summary = buildingSummaries.get(b.id);
                      const implemented = (summary?.length ?? 0) > 0; // TODO: implement building effects
                      const enabled =
                        canPay &&
                        ctx.game.currentPhase === Phase.Main &&
                        implemented;
                      const title = !implemented
                        ? 'Not implemented yet'
                        : !canPay
                          ? 'Cannot pay costs'
                          : ctx.game.currentPhase !== Phase.Main
                            ? 'Not in Main phase'
                            : undefined;
                      return (
                        <button
                          key={b.id}
                          className={`relative border p-3 flex flex-col items-start gap-2 h-full transition-colors transition-transform duration-150 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 hover:cursor-help ${
                            enabled ? '' : 'opacity-50 cursor-not-allowed'
                          }`}
                          title={title}
                          onClick={() =>
                            enabled && handlePerform(buildAction, { id: b.id })
                          }
                          onMouseEnter={() =>
                            handleHoverCard({
                              title: `${actionInfo.build.icon} Build - ${b.name}`,
                              effects: describeContent('building', b.id, ctx),
                              requirements,
                              costs,
                              ...(!implemented && {
                                description: 'Not implemented yet',
                                descriptionClass: 'italic text-red-600',
                              }),
                              bgClass: 'bg-gray-100 dark:bg-gray-700',
                            })
                          }
                          onMouseLeave={clearHoverCard}
                        >
                          <span className="text-base font-medium">
                            {b.name}
                          </span>
                          <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                            {renderCosts(costs, ctx.activePlayer.resources)}
                          </span>
                          <ul className="text-sm list-disc pl-4 text-left">
                            {implemented ? (
                              renderSummary(summary)
                            ) : (
                              <li className="italic text-red-600">
                                Not implemented yet
                              </li>
                            )}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
        <section className="w-[30rem] sticky top-0 self-start flex flex-col gap-6">
          <section
            className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative w-full flex flex-col"
            onMouseEnter={() =>
              ctx.game.currentPhase !== Phase.Main && setPaused(true)
            }
            onMouseLeave={() => setPaused(false)}
            style={{
              cursor:
                phasePaused && ctx.game.currentPhase !== Phase.Main
                  ? 'pause'
                  : 'auto',
              height: playerBoxHeight || undefined,
            }}
          >
            <h2 className="text-xl font-semibold mb-2">
              Turn {ctx.game.turn} - {ctx.activePlayer.name}
            </h2>
            <div className="flex gap-4 mb-2">
              {[Phase.Development, Phase.Upkeep, Phase.Main].map((p) => (
                <span
                  key={p}
                  className={
                    p === ctx.game.currentPhase ? 'font-semibold underline' : ''
                  }
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)} Phase
                </span>
              ))}
            </div>
            <ul
              ref={phaseStepsRef}
              className="text-sm text-left space-y-1 overflow-y-scroll flex-1"
            >
              {phaseSteps.map((s, i) => (
                <li key={i} className={s.active ? 'font-semibold' : ''}>
                  <div>{s.title}</div>
                  <ul className="pl-4 list-disc">
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
            {ctx.game.currentPhase !== Phase.Main && (
              <div className="absolute top-2 right-2">
                <TimerCircle progress={phaseTimer} paused={phasePaused} />
              </div>
            )}
            {ctx.game.currentPhase === Phase.Main && (
              <div className="mt-2 text-right">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  disabled={phaseSteps.some((s) => s.active)}
                  onClick={() => void handleEndTurn()}
                >
                  Next Turn
                </button>
              </div>
            )}
          </section>
          <div className="border rounded p-4 overflow-y-auto max-h-80 bg-white dark:bg-gray-800 shadow w-full">
            <h2 className="text-xl font-semibold mb-2">Log</h2>
            <ul className="mt-2 space-y-1">
              {log.map((entry, idx) => (
                <li key={idx} className="text-xs font-mono whitespace-pre-wrap">
                  [{entry.time}] {entry.text}
                </li>
              ))}
            </ul>
          </div>
          {hoverCard && (
            <div
              className={`border rounded p-4 shadow relative pointer-events-none w-full ${hoverCard.bgClass || 'bg-white dark:bg-gray-800'}`}
            >
              <div className="font-semibold mb-2">
                {hoverCard.title}
                <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
                  {renderCosts(hoverCard.costs, ctx.activePlayer.resources)}
                </span>
              </div>
              {hoverCard.requirements.length > 0 && (
                <div className="mb-2">
                  <div className="font-semibold text-red-600">Requirements</div>
                  <ul className="list-disc pl-4 text-sm text-red-600">
                    {hoverCard.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hoverCard.description && (
                <div
                  className={`mb-2 text-sm ${hoverCard.descriptionClass ?? ''}`}
                >
                  {hoverCard.description}
                </div>
              )}
              {hoverCard.effects.length > 0 && (
                <div>
                  <div className="font-semibold">
                    {hoverCard.effectsTitle ?? 'Effects'}
                  </div>
                  <ul className="list-disc pl-4 text-sm">
                    {renderSummary(hoverCard.effects)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
