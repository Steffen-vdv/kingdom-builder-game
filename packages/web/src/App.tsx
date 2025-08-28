import React, { useMemo, useState } from 'react';
import {
  createEngine,
  performAction,
  runDevelopment,
  runUpkeep,
  Phase,
} from '@kingdom-builder/engine';
import type { EngineContext } from '@kingdom-builder/engine';

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

  const [develop, setDevelop] = useState({ landId: '', id: '' });

  const hasDevelopLand = ctx.activePlayer.lands.some((l) => l.slotsFree > 0);

  function handlePerform(action: Action, params?: Record<string, unknown>) {
    const before = snapshotPlayer(ctx.activePlayer);
    try {
      performAction(action.id, ctx, params);
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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">testlab</h1>

      <section>
        <h2 className="text-xl font-semibold">Player</h2>
        <div className="flex flex-wrap gap-6 mt-2">
          <div>
            <h3 className="font-medium">Resources</h3>
            <ul>
              {Object.entries(ctx.activePlayer.resources).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Stats</h3>
            <ul>
              {Object.entries(ctx.activePlayer.stats).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Buildings</h3>
            <ul>
              {Array.from(ctx.activePlayer.buildings).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-medium">Lands</h3>
            <ul>
              {ctx.activePlayer.lands.map((l) => (
                <li key={l.id}>
                  {l.id} ({l.slotsUsed}/{l.slotsMax}) — [
                  {l.developments.join(', ') || 'empty'}]
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold flex items-center gap-4">
          Actions — phase: {ctx.game.currentPhase}
          <button className="border px-2 py-1" onClick={handleCyclePhase}>
            Next phase
          </button>
        </h2>
        <div className="space-y-2 mt-2">
          {actions.map((action) => (
            <div key={action.id} className="flex items-center gap-2">
              <span className="w-48">{action.name}</span>
              {action.id === 'develop' && (
                <>
                  <select
                    className="border px-1"
                    value={develop.landId}
                    onChange={(e) =>
                      setDevelop((s) => ({ ...s, landId: e.target.value }))
                    }
                  >
                    <option value="">Select land</option>
                    {ctx.activePlayer.lands.map(
                      (l) =>
                        l.slotsFree > 0 && (
                          <option key={l.id} value={l.id}>
                            {l.id}
                          </option>
                        ),
                    )}
                  </select>
                  <select
                    className="border px-1"
                    value={develop.id}
                    onChange={(e) =>
                      setDevelop((s) => ({ ...s, id: e.target.value }))
                    }
                  >
                    <option value="">Select development</option>
                    {developmentOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button
                className="border px-2 py-1"
                disabled={
                  action.id === 'develop' &&
                  (!hasDevelopLand || !develop.landId || !develop.id)
                }
                title={
                  action.id === 'develop' && !hasDevelopLand
                    ? 'No land with free development slot'
                    : undefined
                }
                onClick={() => {
                  if (action.id === 'develop') {
                    handlePerform(action, {
                      id: develop.id,
                      landId: develop.landId,
                    });
                    setDevelop({ landId: '', id: '' });
                  } else handlePerform(action);
                }}
              >
                perform action
              </button>
            </div>
          ))}
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
