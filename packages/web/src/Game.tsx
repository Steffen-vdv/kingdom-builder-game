import React, { useEffect, useMemo, useState } from 'react';
import {
  createEngine,
  performAction,
  runEffects,
  collectTriggerEffects,
  Phase,
  getActionCosts,
  Resource,
} from '@kingdom-builder/engine';
import type {
  EngineContext,
  ActionParams,
  EffectDef,
} from '@kingdom-builder/engine';

interface Land {
  id: string;
  slotsMax: number;
  slotsUsed: number;
  slotsFree: number;
  developments: string[];
}

interface Player {
  resources: Record<string, number>;
  stats: Record<string, number>;
  buildings: Set<string>;
  lands: Land[];
}

type Snapshot = {
  resources: Record<string, number>;
  stats: Record<string, number>;
  buildings: string[];
  lands: {
    id: string;
    slotsMax: number;
    slotsUsed: number;
    developments: string[];
  }[];
};

function snapshotPlayer(player: Player): Snapshot {
  return {
    resources: { ...player.resources },
    stats: { ...player.stats },
    buildings: Array.from(player.buildings ?? []),
    lands: player.lands.map((l) => ({
      id: l.id,
      slotsMax: l.slotsMax,
      slotsUsed: l.slotsUsed,
      developments: [...l.developments],
    })),
  };
}

function diffSnapshots(before: Snapshot, after: Snapshot): string[] {
  const changes: string[] = [];
  for (const key of Object.keys(after.resources)) {
    const b = before.resources[key] ?? 0;
    const a = after.resources[key] ?? 0;
    if (a !== b) changes.push(`Resource ${key}: ${b} -> ${a} (Δ ${a - b})`);
  }
  for (const key of Object.keys(after.stats)) {
    const b = before.stats[key] ?? 0;
    const a = after.stats[key] ?? 0;
    if (a !== b) changes.push(`Stat ${key}: ${b} -> ${a} (Δ ${a - b})`);
  }
  const beforeB = new Set(before.buildings);
  const afterB = new Set(after.buildings);
  for (const id of afterB)
    if (!beforeB.has(id)) changes.push(`Building added: ${id}`);
  for (const land of after.lands) {
    const prev = before.lands.find((l) => l.id === land.id);
    if (!prev) {
      changes.push(`Land added: ${land.id}`);
      continue;
    }
    for (const dev of land.developments)
      if (!prev.developments.includes(dev))
        changes.push(`Development ${dev} added to ${land.id}`);
  }
  return changes;
}

interface Action {
  id: string;
  name: string;
}
interface Development {
  id: string;
  name: string;
}
interface Building {
  id: string;
  name: string;
}

const resourceInfo = {
  [Resource.gold]: { icon: '🪙', label: 'Gold' },
  [Resource.ap]: { icon: '⚡', label: 'Action Points' },
  [Resource.happiness]: { icon: '😊', label: 'Happiness' },
  [Resource.castleHP]: { icon: '🏰', label: 'Castle HP' },
} as const;

const statInfo: Record<string, { icon: string; label: string }> = {
  maxPopulation: { icon: '👥', label: 'Max Population' },
  armyStrength: { icon: '🗡️', label: 'Army Strength' },
  fortificationStrength: { icon: '🛡️', label: 'Fortification Strength' },
  absorption: { icon: '🌀', label: 'Absorption' },
  armyGrowth: { icon: '📈', label: 'Army Growth' },
};

const populationInfo: Record<string, { icon: string; label: string }> = {
  council: { icon: '⚖️', label: 'Council' },
  commander: { icon: '🎖️', label: 'Army Commander' },
  fortifier: { icon: '🧱', label: 'Fortifier' },
  citizen: { icon: '👤', label: 'Citizen' },
};

const actionInfo = {
  expand: { icon: '🌱' },
  overwork: { icon: '🛠️' },
  develop: { icon: '🏗️' },
  tax: { icon: '💰' },
  reallocate: { icon: '🔄' },
  raise_pop: { icon: '👶' },
  royal_decree: { icon: '📜' },
  army_attack: { icon: '🗡️' },
  hold_festival: { icon: '🎉' },
  plow: { icon: '🚜' },
  build: { icon: '🧱' },
} as const;

const developmentInfo: Record<string, { icon: string; label: string }> = {
  house: { icon: '🏠', label: 'House' },
  farm: { icon: '🌾', label: 'Farm' },
  outpost: { icon: '🛡️', label: 'Outpost' },
  watchtower: { icon: '🗼', label: 'Watchtower' },
  garden: { icon: '🌿', label: 'Garden' },
};

const landIcon = '🗺️';
const slotIcon = '🧩';
const buildingIcon = '🧱';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion */
function summarizeEffects(
  effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
  ctx: EngineContext,
): string[] {
  const parts: string[] = [];
  for (const eff of effects || []) {
    if (eff.evaluator) {
      const ev = eff.evaluator as {
        type: string;
        params: Record<string, unknown>;
      };
      if (ev.type === 'development') {
        const sub = summarizeEffects(eff.effects, ctx);
        const devParams = ev.params as Record<string, string>;
        const devId = devParams['id']!;
        const icon = developmentInfo[devId]?.icon || devId;
        sub.forEach((s) => parts.push(`${s} per ${icon}`));
      } else {
        parts.push(...summarizeEffects(eff.effects, ctx));
      }
      continue;
    }
    switch (eff.type) {
      case 'resource': {
        if (eff.method === 'add' && eff.params) {
          const key = eff.params['key'] as string;
          const res = resourceInfo[key as keyof typeof resourceInfo];
          const icon = res ? res.icon : key;
          const amount = Number(eff.params['amount']);
          parts.push(`${icon}${amount >= 0 ? '+' : ''}${amount}`);
        }
        break;
      }
      case 'stat': {
        if (eff.method === 'add' && eff.params) {
          const key = eff.params['key'] as string;
          const stat = statInfo[key];
          const icon = stat ? stat.icon : key;
          const amount = Number(eff.params['amount']);
          if (key === 'maxPopulation')
            parts.push(`Max ${icon}${amount >= 0 ? '+' : ''}${amount}`);
          else if (key === 'absorption')
            parts.push(
              `${icon}${amount * 100 >= 0 ? '+' : ''}${amount * 100}%`,
            );
          else parts.push(`${icon}${amount >= 0 ? '+' : ''}${amount}`);
        }
        break;
      }
      case 'land': {
        if (eff.method === 'add') {
          const params = eff.params as Record<string, unknown> | undefined;
          const count = Number(params?.['count'] ?? 1);
          parts.push(`${landIcon}+${count}`);
        }
        break;
      }
      case 'development': {
        if (eff.params) {
          const id = eff.params['id'] as string;
          const icon = developmentInfo[id]?.icon || id;
          if (eff.method === 'add') parts.push(`${icon}`);
          else if (eff.method === 'remove') parts.push(`remove ${icon}`);
        }
        break;
      }
      case 'building': {
        if (eff.method === 'add' && eff.params) {
          const id = eff.params['id'] as string;
          let name = id;
          try {
            name = ctx.buildings.get(id).name;
          } catch {
            // fall back to raw id when the building is not registered yet
          }
          parts.push(`${buildingIcon}${name}`);
        }
        break;
      }
      case 'cost_mod': {
        if (eff.method === 'add' && eff.params) {
          const key = eff.params['key'] as string;
          const icon =
            resourceInfo[key as keyof typeof resourceInfo]?.icon || key;
          const amount = Number(eff.params['amount']);
          const actionId = eff.params['actionId'] as string;
          const actionIcon =
            actionInfo[actionId as keyof typeof actionInfo]?.icon || actionId;
          parts.push(
            `${actionIcon} cost ${icon}${amount >= 0 ? '+' : ''}${amount}`,
          );
        }
        break;
      }
      case 'result_mod': {
        if (eff.method === 'add' && eff.params) {
          const sub = summarizeEffects(eff.effects || [], ctx);
          const actionId = eff.params['actionId'] as string;
          const actionIcon =
            actionInfo[actionId as keyof typeof actionInfo]?.icon || actionId;
          sub.forEach((s) => parts.push(`${actionIcon}: ${s}`));
        }
        break;
      }
      case 'passive': {
        if (eff.method === 'add') {
          const sub = summarizeEffects(eff.effects || [], ctx);
          if (sub.length) parts.push(...sub);
        }
        break;
      }
      default:
        break;
    }
  }
  return parts.map((p) => p.trim());
}

function summarizeAction(id: string, ctx: EngineContext) {
  const def = ctx.actions.get(id);
  return summarizeEffects(def.effects, ctx);
}

function summarizeDevelopment(id: string, ctx: EngineContext) {
  const def = ctx.developments.get(id);
  const parts: string[] = [];
  if (def.onBuild) parts.push(...summarizeEffects(def.onBuild, ctx));
  if (def.onDevelopmentPhase)
    parts.push(
      ...summarizeEffects(def.onDevelopmentPhase, ctx).map(
        (s) => `On Development phase: ${s}`,
      ),
    );
  if (def.onUpkeepPhase)
    parts.push(
      ...summarizeEffects(def.onUpkeepPhase, ctx).map(
        (s) => `On Upkeep phase: ${s}`,
      ),
    );
  if (def.onAttackResolved)
    parts.push(
      ...summarizeEffects(def.onAttackResolved, ctx).map(
        (s) => `After attack: ${s}`,
      ),
    );
  return parts.map((p) => p.trim());
}

function summarizeBuilding(id: string, ctx: EngineContext) {
  const def = ctx.buildings.get(id);
  const parts: string[] = [];
  if (def.onBuild) parts.push(...summarizeEffects(def.onBuild, ctx));
  if (def.onDevelopmentPhase)
    parts.push(
      ...summarizeEffects(def.onDevelopmentPhase, ctx).map(
        (s) => `On Development phase: ${s}`,
      ),
    );
  if (def.onUpkeepPhase)
    parts.push(
      ...summarizeEffects(def.onUpkeepPhase, ctx).map(
        (s) => `On Upkeep phase: ${s}`,
      ),
    );
  if (def.onAttackResolved)
    parts.push(
      ...summarizeEffects(def.onAttackResolved, ctx).map(
        (s) => `After attack: ${s}`,
      ),
    );
  return parts.map((p) => p.trim());
}
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion */

function renderCosts(
  costs: Record<string, number>,
  resources: Record<string, number>,
) {
  const entries = Object.entries(costs).filter(([k]) => k !== Resource.ap);
  if (entries.length === 0)
    return <span className="mr-1 text-gray-400 italic">Free</span>;
  return (
    <>
      {entries.map(([k, v]) => (
        <span
          key={k}
          className={`mr-1 ${(resources[k] ?? 0) < v ? 'text-red-500' : ''}`}
        >
          {resourceInfo[k as keyof typeof resourceInfo]?.icon}
          {v}
        </span>
      ))}
    </>
  );
}

export default function Game({ onExit }: { onExit?: () => void }) {
  const ctx = useMemo<EngineContext>(() => {
    const c = createEngine();
    return c;
  }, []);

  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [log, setLog] = useState<{ time: string; text: string }[]>([]);
  const addLog = (entry: string | string[], playerName?: string) =>
    setLog((prev) => [
      ...(Array.isArray(entry) ? entry : [entry]).map((text) => ({
        time: new Date().toLocaleTimeString(),
        text: `[${playerName ?? ctx.activePlayer.name}] ${text}`,
      })),
      ...prev,
    ]);

  const actions = useMemo<Action[]>(
    () =>
      Array.from(
        (ctx.actions as unknown as { map: Map<string, Action> }).map.values(),
      ),
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
    const map = new Map<string, string[]>();
    actions.forEach((a) => map.set(a.id, summarizeAction(a.id, ctx)));
    return map;
  }, [actions, ctx]);
  const developmentSummaries = useMemo(() => {
    const map = new Map<string, string[]>();
    sortedDevelopments.forEach((d) =>
      map.set(d.id, summarizeDevelopment(d.id, ctx)),
    );
    return map;
  }, [sortedDevelopments, ctx]);
  const buildingSummaries = useMemo(() => {
    const map = new Map<string, string[]>();
    buildingOptions.forEach((b) => map.set(b.id, summarizeBuilding(b.id, ctx)));
    return map;
  }, [buildingOptions, ctx]);

  const hasDevelopLand = ctx.activePlayer.lands.some((l) => l.slotsFree > 0);
  const developAction = actions.find((a) => a.id === 'develop');
  const buildAction = actions.find((a) => a.id === 'build');
  const otherActions = actions.filter(
    (a) => a.id !== 'develop' && a.id !== 'build',
  );

  function handlePerform(action: Action, params?: Record<string, unknown>) {
    const before = snapshotPlayer(ctx.activePlayer);
    try {
      performAction(action.id, ctx, params as ActionParams<string>);
      const after = snapshotPlayer(ctx.activePlayer);
      const changes = diffSnapshots(before, after);
      addLog([
        `Action ${
          actionInfo[action.id as keyof typeof actionInfo]?.icon || ''
        } ${action.name} performed`,
        ...changes.map((c) => `  ${c}`),
      ]);
    } catch (e) {
      addLog(
        `Action ${
          actionInfo[action.id as keyof typeof actionInfo]?.icon || ''
        } ${action.name} failed: ${(e as Error).message}`,
      );
    }
    refresh();
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runPhaseForPlayer(
    trigger: 'onDevelopmentPhase' | 'onUpkeepPhase',
    index: number,
  ) {
    ctx.game.currentPlayerIndex = index;
    const player = ctx.activePlayer;
    const effects = collectTriggerEffects(trigger, ctx, player);
    for (const effect of effects) {
      const before = snapshotPlayer(player);
      runEffects([effect], ctx);
      const after = snapshotPlayer(player);
      const changes = diffSnapshots(before, after);
      if (changes.length) addLog(changes, player.name);
      refresh();
      await sleep(1000);
    }
  }

  async function startTurn(playerIndex: number) {
    ctx.game.currentPlayerIndex = playerIndex;
    ctx.game.currentPhase = Phase.Development;
    await runPhaseForPlayer('onDevelopmentPhase', playerIndex);
    ctx.game.currentPhase = Phase.Upkeep;
    await runPhaseForPlayer('onUpkeepPhase', playerIndex);
    ctx.game.currentPhase = Phase.Main;
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

  function PlayerPanel({
    player,
    active,
  }: {
    player: typeof ctx.activePlayer;
    active: boolean;
  }) {
    const popEntries = Object.entries(player.population).filter(
      ([, v]) => v > 0,
    );
    const currentPop = popEntries.reduce((sum, [, v]) => sum + v, 0);
    const popDetails = popEntries.map(([role, count]) => ({ role, count }));
    function formatStatValue(key: string, value: number) {
      if (key === 'absorption') return `${value * 100}%`;
      return String(value);
    }

    const devCounts = new Map<string, number>();
    let slotsFree = 0;
    player.lands.forEach((land) => {
      land.developments.forEach((d) =>
        devCounts.set(d, (devCounts.get(d) || 0) + 1),
      );
      slotsFree += land.slotsFree;
    });
    const landItems: {
      key: string;
      icon: string;
      label: string;
      count: number;
    }[] = [];
    devCounts.forEach((count, id) =>
      landItems.push({
        key: id,
        icon: developmentInfo[id]?.icon || id,
        label: developmentInfo[id]?.label || id,
        count,
      }),
    );
    if (slotsFree > 0)
      landItems.push({
        key: 'slot',
        icon: slotIcon,
        label: 'Empty development slot',
        count: slotsFree,
      });
    const landBar = (
      <span className="bar-item">
        <span title="Land">{landIcon}</span>
        {' ('}
        {landItems.map((item, i) => (
          <React.Fragment key={item.key}>
            {i > 0 && ','}
            <span title={item.label}>
              {item.icon}
              {item.count}
            </span>
          </React.Fragment>
        ))}
        {')'}
      </span>
    );

    const playerPassives = ctx.passives.list().filter((id) => {
      if (id.startsWith('watchtower_absorption_')) {
        const landId = id.replace('watchtower_absorption_', '');
        return player.lands.some((l) => l.id === landId);
      }
      return true;
    });

    function describePassive(id: string): string {
      if (id.startsWith('watchtower_absorption_'))
        return '50% absorption. Source: Watchtower. Removed after having been attacked';
      return id;
    }

    return (
      <div className="space-y-1">
        <h3
          className={
            active ? 'font-bold underline' : 'text-gray-500 font-semibold'
          }
        >
          {player.name}
        </h3>
        <div className="flex flex-wrap items-center gap-2 border p-2 rounded">
          {Object.entries(player.resources).map(([k, v]) => (
            <span
              key={k}
              title={resourceInfo[k as keyof typeof resourceInfo]?.label}
              className="bar-item"
            >
              {resourceInfo[k as keyof typeof resourceInfo]?.icon}
              {v}
            </span>
          ))}
          <div className="h-4 border-l" />
          <span
            title={`Population ${currentPop}/${player.maxPopulation}`}
            className="bar-item"
          >
            👥{currentPop}/{player.maxPopulation}
            {popDetails.length > 0 && (
              <>
                {' ('}
                {popDetails.map(({ role, count }, i) => (
                  <React.Fragment key={role}>
                    {i > 0 && ','}
                    <span title={populationInfo[role]?.label}>
                      {populationInfo[role]?.icon}
                      {count}
                    </span>
                  </React.Fragment>
                ))}
                {')'}
              </>
            )}
          </span>
          {Object.entries(player.stats)
            .filter(([k]) => k !== 'maxPopulation')
            .map(([k, v]) => (
              <span
                key={k}
                title={statInfo[k]?.label || k}
                className="bar-item"
              >
                {statInfo[k]?.icon}
                {formatStatValue(k, v)}
              </span>
            ))}
          <div className="h-4 border-l" />
          {landBar}
        </div>
        {playerPassives.length > 0 && (
          <div className="border p-2 rounded">
            <h4 className="font-medium">Passives</h4>
            <ul className="mt-1 list-disc list-inside">
              {playerPassives.map((p) => (
                <li key={p}>{describePassive(p)}</li>
              ))}
            </ul>
          </div>
        )}
        {player.buildings.size > 0 && (
          <div className="border p-2 rounded">
            <h4 className="font-medium">Buildings</h4>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {Array.from(player.buildings).map((b) => (
                <span
                  key={b}
                  title={ctx.buildings.get(b)?.name || b}
                  className="bar-item"
                >
                  {buildingIcon}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex gap-4 w-full">
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-center flex-1">
            Kingdom Builder
          </h1>
          <span className="ml-4">Turn {ctx.game.turn}</span>
          {onExit && (
            <button className="border px-2 py-1 ml-4" onClick={onExit}>
              Back to Menu
            </button>
          )}
        </div>

        <section className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Players</h2>
          <div className="flex flex-wrap gap-4">
            {ctx.game.players.map((p) => (
              <PlayerPanel
                key={p.id}
                player={p}
                active={p.id === ctx.activePlayer.id}
              />
            ))}
          </div>
        </section>

        <section className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">Phases</h2>
          <div className="flex flex-wrap items-center gap-4">
            {Object.values(Phase).map((p) => (
              <span
                key={p}
                className={
                  p === ctx.game.currentPhase
                    ? 'font-bold underline'
                    : 'text-gray-500'
                }
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            ))}
          </div>
        </section>

        <section className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-2">
            Actions (1 {resourceInfo[Resource.ap].icon} each)
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {otherActions.map((action) => {
                const costs = getActionCosts(action.id, ctx);
                const canPay = Object.entries(costs).every(
                  ([k, v]) =>
                    ctx.activePlayer.resources[
                      k as keyof typeof ctx.activePlayer.resources
                    ] >= v,
                );
                const enabled = canPay && ctx.game.currentPhase === Phase.Main;
                const title = !canPay
                  ? 'Cannot pay costs'
                  : ctx.game.currentPhase !== Phase.Main
                    ? 'Not in Main phase'
                    : undefined;
                return (
                  <button
                    key={action.id}
                    className={`relative border p-3 flex flex-col items-start gap-2 h-full ${
                      enabled ? '' : 'opacity-50 border-red-500'
                    }`}
                    disabled={!enabled}
                    title={title}
                    onClick={() => handlePerform(action)}
                  >
                    <span className="text-base font-medium">
                      {actionInfo[action.id as keyof typeof actionInfo]?.icon}{' '}
                      {action.name}
                    </span>
                    <span className="absolute top-2 right-2 text-sm text-gray-600">
                      {renderCosts(costs, ctx.activePlayer.resources)}
                    </span>
                    <ul className="text-sm list-disc list-inside">
                      {actionSummaries.get(action.id)?.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

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
                    const canPay =
                      hasDevelopLand &&
                      Object.entries(costs).every(
                        ([k, v]) =>
                          ctx.activePlayer.resources[
                            k as keyof typeof ctx.activePlayer.resources
                          ] >= v,
                      );
                    const enabled =
                      canPay && ctx.game.currentPhase === Phase.Main;
                    const title = !hasDevelopLand
                      ? 'No land with free development slot'
                      : !canPay
                        ? 'Cannot pay costs'
                        : ctx.game.currentPhase !== Phase.Main
                          ? 'Not in Main phase'
                          : undefined;
                    return (
                      <button
                        key={d.id}
                        className={`relative border p-3 flex flex-col items-start gap-2 h-full ${
                          enabled ? '' : 'opacity-50 border-red-500'
                        }`}
                        disabled={!enabled}
                        title={title}
                        onClick={() => {
                          const landId = ctx.activePlayer.lands.find(
                            (l) => l.slotsFree > 0,
                          )?.id;
                          handlePerform(developAction, { id: d.id, landId });
                        }}
                      >
                        <span className="text-base font-medium">
                          {developmentInfo[d.id]?.icon} {d.name}
                        </span>
                        <span className="absolute top-2 right-2 text-sm text-gray-600">
                          {renderCosts(costs, ctx.activePlayer.resources)}
                        </span>
                        <ul className="text-sm list-disc list-inside">
                          {developmentSummaries.get(d.id)?.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
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
                    const canPay = Object.entries(costs).every(
                      ([k, v]) =>
                        ctx.activePlayer.resources[
                          k as keyof typeof ctx.activePlayer.resources
                        ] >= v,
                    );
                    const enabled =
                      canPay && ctx.game.currentPhase === Phase.Main;
                    const title = !canPay
                      ? 'Cannot pay costs'
                      : ctx.game.currentPhase !== Phase.Main
                        ? 'Not in Main phase'
                        : undefined;
                    return (
                      <button
                        key={b.id}
                        className={`relative border p-3 flex flex-col items-start gap-2 h-full ${
                          enabled ? '' : 'opacity-50 border-red-500'
                        }`}
                        disabled={!enabled}
                        title={title}
                        onClick={() => handlePerform(buildAction, { id: b.id })}
                      >
                        <span className="text-base font-medium">{b.name}</span>
                        <span className="absolute top-2 right-2 text-sm text-gray-600">
                          {renderCosts(costs, ctx.activePlayer.resources)}
                        </span>
                        <ul className="text-sm list-disc list-inside">
                          {buildingSummaries.get(b.id)?.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            className="border px-2 py-1 mt-4"
            disabled={
              ctx.game.currentPhase !== Phase.Main || ctx.activePlayer.ap > 0
            }
            onClick={() => void handleEndTurn()}
          >
            End turn
            {ctx.activePlayer.ap > 0 && (
              <span className="block text-xs text-red-500">
                You still have unspent AP
              </span>
            )}
          </button>
        </section>
      </div>
      <section className="border rounded p-4 w-96 max-h-screen overflow-y-auto sticky top-4 self-start">
        <h2 className="text-xl font-semibold mb-2">Log</h2>
        <ul className="mt-2 space-y-1">
          {log.map((entry, idx) => (
            <li key={idx} className="text-xs font-mono whitespace-pre-wrap">
              [{entry.time}] {entry.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
