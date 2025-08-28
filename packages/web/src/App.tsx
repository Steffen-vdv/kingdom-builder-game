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

const populationInfo: Record<string, { icon: string; label: string }> = {
  council: { icon: '📜', label: 'Council' },
  commander: { icon: '🗡️', label: 'Commander' },
  fortifier: { icon: '🛡️', label: 'Fortifier' },
  citizen: { icon: '👤', label: 'Citizen' },
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
  const [log, setLog] = useState<string[]>([]);
  const addLog = (entry: string | string[]) =>
    setLog((prev) => [...prev, ...(Array.isArray(entry) ? entry : [entry])]);

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

  const [developId, setDevelopId] = useState('');
  const [buildId, setBuildId] = useState('');

  const hasDevelopLand = ctx.activePlayer.lands.some((l) => l.slotsFree > 0);

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
      <div className="space-y-2">
        <h3 className="font-semibold">{player.name}</h3>
        <div>
          <h4 className="font-medium">Resources</h4>
          <ul>
            {Object.entries(player.resources).map(([k, v]) => (
              <li key={k}>
                {resourceInfo[k as keyof typeof resourceInfo]?.icon}
                {resourceInfo[k as keyof typeof resourceInfo]?.label}: {v}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium">Stats</h4>
          <ul>
            <li>
              👥 Population: {currentPop}/{player.maxPopulation} (
              {popEntries.map(([role, count], idx) => (
                <span key={role}>
                  {populationInfo[role]?.icon}
                  {count}
                  {idx < popEntries.length - 1 ? ', ' : ''}
                </span>
              ))}
              )
            </li>
            {Object.entries(player.stats)
              .filter(([k]) => k !== 'maxPopulation')
              .map(([k, v]) => (
                <li key={k}>
                  {statInfo[k]?.icon}
                  {statInfo[k]?.label || k}: {v}
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium">Buildings</h4>
          <ul>
            {Array.from(player.buildings).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium">Lands</h4>
          <ul>
            {player.lands.map((l) => (
              <li key={l.id}>
                ({l.slotsUsed}/{l.slotsMax}) — [
                {l.developments.join(', ') || 'empty'}]
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Kingdom Builder</h1>

      <section>
        <h2 className="text-xl font-semibold">Players</h2>
        <div className="flex flex-wrap gap-6 mt-2">
          {ctx.game.players.map((p) => (
            <PlayerPanel key={p.id} player={p} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Phases</h2>
        <div className="flex items-center gap-4 mt-2">
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

      <section>
        <h2 className="text-xl font-semibold">Actions</h2>
        <div className="space-y-2 mt-2">
          {actions.map((action) => {
            const costs =
              action.id === 'build' && buildId
                ? getActionCosts('build', ctx, { id: buildId })
                : getActionCosts(action.id, ctx);
            return (
              <div key={action.id} className="flex items-center gap-2">
                <span className="w-48">{action.name}</span>
                {action.id === 'develop' && (
                  <select
                    className="border px-1"
                    value={developId}
                    onChange={(e) => setDevelopId(e.target.value)}
                  >
                    <option value="">Select development</option>
                    {developmentOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                {action.id === 'build' && (
                  <select
                    className="border px-1"
                    value={buildId}
                    onChange={(e) => setBuildId(e.target.value)}
                  >
                    <option value="">Select building</option>
                    {buildingOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-sm text-gray-600">
                  {renderCosts(costs)}
                </span>
                <button
                  className="border px-2 py-1"
                  disabled={
                    (action.id === 'develop' &&
                      (!hasDevelopLand || !developId)) ||
                    (action.id === 'build' && !buildId)
                  }
                  title={
                    action.id === 'develop' && !hasDevelopLand
                      ? 'No land with free development slot'
                      : undefined
                  }
                  onClick={() => {
                    if (action.id === 'develop') {
                      const landId = ctx.activePlayer.lands.find(
                        (l) => l.slotsFree > 0,
                      )?.id;
                      handlePerform(action, { id: developId, landId });
                      setDevelopId('');
                    } else if (action.id === 'build') {
                      handlePerform(action, { id: buildId });
                      setBuildId('');
                    } else handlePerform(action);
                  }}
                >
                  perform action
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Log</h2>
        <ul className="mt-2 space-y-1">
          {log.map((entry, idx) => (
            <li key={idx} className="text-sm font-mono whitespace-pre-wrap">
              {entry}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
