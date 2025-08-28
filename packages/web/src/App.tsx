import React, { useMemo, useState } from 'react';
import {
  createEngine,
  performAction,
  runDevelopment,
  runUpkeep,
  Phase,
  getActionCosts,
  Resource,
} from '@kingdom-builder/engine';
import type { EngineContext, ActionParams } from '@kingdom-builder/engine';

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
  armyStrength: { icon: '⚔️', label: 'Army Strength' },
  fortificationStrength: { icon: '🛡️', label: 'Fortification Strength' },
  absorption: { icon: '🛡️', label: 'Absorption' },
  armyGrowth: { icon: '📈', label: 'Army Growth' },
};

function renderCosts(costs: Record<string, number>) {
  return (
    <>
      {Object.entries(costs).map(([k, v]) => (
        <span key={k} className="mr-1">
          {resourceInfo[k as keyof typeof resourceInfo]?.icon}
          {v}
        </span>
      ))}
    </>
  );
}

export default function App() {
  const ctx = useMemo<EngineContext>(() => {
    const c = createEngine();
    c.activePlayer.ap = 30;
    return c;
  }, []);

  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);
  const [log, setLog] = useState<{ time: string; text: string }[]>([]);
  const addLog = (entry: string | string[]) =>
    setLog((prev) => [
      ...(Array.isArray(entry) ? entry : [entry]).map((text) => ({
        time: new Date().toLocaleTimeString(),
        text,
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
  const buildingOptions = useMemo<Building[]>(
    () =>
      Array.from(
        (
          ctx.buildings as unknown as { map: Map<string, Building> }
        ).map.values(),
      ),
    [ctx],
  );

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
        `Action ${action.name} performed`,
        ...changes.map((c) => `  ${c}`),
      ]);
    } catch (e) {
      addLog(`Action ${action.name} failed: ${(e as Error).message}`);
    }
    refresh();
  }

  function handleCyclePhase() {
    const before = snapshotPlayer(ctx.activePlayer);
    const current = ctx.game.currentPhase;
    if (current === Phase.Development) runUpkeep(ctx);
    else if (current === Phase.Upkeep) ctx.game.currentPhase = Phase.Main;
    else runDevelopment(ctx);
    const after = snapshotPlayer(ctx.activePlayer);
    const changes = diffSnapshots(before, after);
    addLog([
      `Phase changed to ${ctx.game.currentPhase}`,
      ...changes.map((c) => `  ${c}`),
    ]);
    refresh();
  }

  function PlayerPanel({ player }: { player: typeof ctx.activePlayer }) {
    const popEntries = Object.entries(player.population).filter(
      ([, v]) => v > 0,
    );
    const currentPop = popEntries.reduce((sum, [, v]) => sum + v, 0);
    return (
      <div className="space-y-1">
        <h3 className="font-semibold">{player.name}</h3>
        <div className="flex flex-wrap items-center gap-2 border p-2 rounded">
          {Object.entries(player.resources).map(([k, v]) => (
            <span
              key={k}
              title={resourceInfo[k as keyof typeof resourceInfo]?.label}
              className="flex items-center gap-1"
            >
              {resourceInfo[k as keyof typeof resourceInfo]?.icon}
              {v}
            </span>
          ))}
          <div className="h-4 border-l" />
          <span
            title={`Population ${currentPop}/${player.maxPopulation}`}
            className="flex items-center gap-1"
          >
            👥{currentPop}/{player.maxPopulation}
          </span>
          {Object.entries(player.stats)
            .filter(([k]) => k !== 'maxPopulation')
            .map(([k, v]) => (
              <span
                key={k}
                title={statInfo[k]?.label || k}
                className="flex items-center gap-1"
              >
                {statInfo[k]?.icon}
                {v}
              </span>
            ))}
          <div className="h-4 border-l" />
          {Array.from(player.buildings).map((b) => (
            <span key={b} title={b} className="flex items-center">
              🏗️
            </span>
          ))}
          <div className="h-4 border-l" />
          {player.lands.map((l) => (
            <span
              key={l.id}
              title={`${l.id} (${l.slotsUsed}/${l.slotsMax}) — [${l.developments.join(', ') || 'empty'}]`}
              className="flex items-center gap-1"
            >
              🌄{l.slotsUsed}/{l.slotsMax}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-screen-lg mx-auto">
      <h1 className="text-2xl font-bold text-center">Kingdom Builder</h1>

      <section className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Players</h2>
        <div className="flex flex-wrap gap-4">
          {ctx.game.players.map((p) => (
            <PlayerPanel key={p.id} player={p} />
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
              {p}
            </span>
          ))}
          <button className="border px-2 py-1" onClick={handleCyclePhase}>
            Next phase
          </button>
        </div>
      </section>

      <section className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Actions</h2>
        <div className="space-y-4">
          {otherActions.map((action) => {
            const costs = getActionCosts(action.id, ctx);
            return (
              <button
                key={action.id}
                className="border px-2 py-1 flex items-center gap-1"
                onClick={() => handlePerform(action)}
              >
                {action.name}
                <span className="text-sm text-gray-600">
                  {renderCosts(costs)}
                </span>
              </button>
            );
          })}

          {developAction && (
            <div>
              <h3 className="font-medium">Develop</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {developmentOptions.map((d) => {
                  const landIdForCost = ctx.activePlayer.lands[0]?.id as string;
                  const costs = getActionCosts('develop', ctx, {
                    id: d.id,
                    landId: landIdForCost,
                  });
                  return (
                    <button
                      key={d.id}
                      className="border px-2 py-1 flex items-center gap-1"
                      disabled={!hasDevelopLand}
                      title={
                        !hasDevelopLand
                          ? 'No land with free development slot'
                          : undefined
                      }
                      onClick={() => {
                        const landId = ctx.activePlayer.lands.find(
                          (l) => l.slotsFree > 0,
                        )?.id;
                        handlePerform(developAction, { id: d.id, landId });
                      }}
                    >
                      {d.name}
                      <span className="text-sm text-gray-600">
                        {renderCosts(costs)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {buildAction && (
            <div>
              <h3 className="font-medium">Build</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {buildingOptions.map((b) => {
                  const costs = getActionCosts('build', ctx, { id: b.id });
                  return (
                    <button
                      key={b.id}
                      className="border px-2 py-1 flex items-center gap-1"
                      onClick={() => handlePerform(buildAction, { id: b.id })}
                    >
                      {b.name}
                      <span className="text-sm text-gray-600">
                        {renderCosts(costs)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border rounded p-4">
        <h2 className="text-xl font-semibold mb-2">Log</h2>
        <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto">
          {log.map((entry, idx) => (
            <li key={idx} className="text-sm font-mono whitespace-pre-wrap">
              [{entry.time}] {entry.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
