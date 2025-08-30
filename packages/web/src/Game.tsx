import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getActionCosts,
  getActionRequirements,
  Resource,
  PopulationRole,
  RESOURCES,
  POPULATION_ROLES,
  ACTION_INFO as actionInfo,
  DEVELOPMENT_INFO as developmentInfo,
  BUILDING_INFO as buildingInfo,
} from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/engine';
import { summarizeContent, describeContent, type Summary } from './translation';
import { GameProvider, useGameEngine } from './state/GameContext';
import PlayerPanel from './components/player/PlayerPanel';

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

function renderCosts(
  costs: Record<string, number> | undefined,
  resources: Record<string, number>,
) {
  if (!costs) return null;
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
    handleHoverCard,
    clearHoverCard,
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
    handlePerform,
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

  function formatRequirement(req: string): string {
    return req;
  }

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
          <section className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative">
            {!isActionPhase && (
              <div className="absolute inset-0 bg-gray-200/60 dark:bg-gray-900/60 rounded pointer-events-none" />
            )}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">
                Actions (1 {RESOURCES[Resource.ap].icon} each)
              </h2>
              {!isActionPhase && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Not in Main phase
                </span>
              )}
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
                    canPay && meetsReq && isActionPhase && implemented;
                  const title = !implemented
                    ? 'Not implemented yet'
                    : !meetsReq
                      ? requirements.join(', ')
                      : !canPay
                        ? 'Cannot pay costs'
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
                          title: `${actionInfo[action.id]?.icon || ''} ${action.name}`,
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
                        {actionInfo[action.id]?.icon || ''} {action.name}
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
                    {actionInfo['raise_pop']?.icon ?? ''}{' '}
                    {actionInfo['raise_pop']?.label ?? ''}
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
                      const enabled = canPay && meetsReq && isActionPhase;
                      const title = !meetsReq
                        ? requirements.join(', ')
                        : !canPay
                          ? 'Cannot pay costs'
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
                              title: `${actionInfo['raise_pop']?.icon ?? ''} ${actionInfo['raise_pop']?.label ?? ''} - ${
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
                    {actionInfo['develop']?.icon ?? ''}{' '}
                    {actionInfo['develop']?.label ?? ''}
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
                      const enabled = canPay && isActionPhase && implemented;
                      const title = !implemented
                        ? 'Not implemented yet'
                        : !hasDevelopLand
                          ? 'No land with free development slot'
                          : !canPay
                            ? 'Cannot pay costs'
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
                              title: `${actionInfo['develop']?.icon ?? ''} ${actionInfo['develop']?.label ?? ''} - ${
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
                  <h3 className="font-medium">
                    {actionInfo['build']?.icon ?? ''}{' '}
                    {actionInfo['build']?.label ?? ''}
                  </h3>
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
                      const enabled = canPay && isActionPhase && implemented;
                      const title = !implemented
                        ? 'Not implemented yet'
                        : !canPay
                          ? 'Cannot pay costs'
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
                              title: `${actionInfo['build']?.icon ?? ''} ${actionInfo['build']?.label ?? ''} - ${
                                buildingInfo[b.id]?.icon || ''
                              } ${b.name}`,
                              effects: buildingDescriptions.get(b.id) ?? [],
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
                            {buildingInfo[b.id]?.icon ||
                              actionInfo['build']?.icon ||
                              ''}{' '}
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
