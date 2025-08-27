import { useState } from 'react';
import {
  createEngine,
  performAction,
  Phase,
  runEffects,
  applyParamsToEffects,
} from '@kingdom-builder/engine';

type Player = ReturnType<typeof createEngine>['game']['active'];
type Land = Player['lands'][number];

function snapshot(player: Player) {
  return {
    resources: { ...player.resources },
    stats: { ...player.stats },
    buildings: Array.from(player.buildings),
    lands: player.lands.map((l: Land) => ({
      id: l.id,
      slotsMax: l.slotsMax,
      slotsUsed: l.slotsUsed,
      developments: [...l.developments],
    })),
  };
}

function diff(
  before: ReturnType<typeof snapshot>,
  after: ReturnType<typeof snapshot>,
) {
  const changes: string[] = [];
  for (const key of Object.keys(
    before.resources,
  ) as (keyof typeof before.resources)[]) {
    const from = before.resources[key];
    const to = after.resources[key];
    if (from !== to) {
      const delta = to - from;
      const sign = delta >= 0 ? '+' : '';
      changes.push(`${key}: ${from} ${sign}${delta} => ${to}`);
    }
  }
  for (const key of Object.keys(
    before.stats,
  ) as (keyof typeof before.stats)[]) {
    const from = before.stats[key];
    const to = after.stats[key];
    if (from !== to) {
      const delta = to - from;
      const sign = delta >= 0 ? '+' : '';
      changes.push(`${key}: ${from} ${sign}${delta} => ${to}`);
    }
  }
  const beforeBuildings = new Set(before.buildings);
  for (const b of after.buildings) {
    if (!beforeBuildings.has(b)) changes.push(`building ${b}: 0 +1 => 1`);
  }
  if (before.lands.length !== after.lands.length) {
    const delta = after.lands.length - before.lands.length;
    const sign = delta >= 0 ? '+' : '';
    changes.push(
      `lands: ${before.lands.length} ${sign}${delta} => ${after.lands.length}`,
    );
  }
  for (let i = 0; i < Math.min(before.lands.length, after.lands.length); i++) {
    const bLand = before.lands[i]!;
    const aLand = after.lands[i]!;
    if (bLand.developments.length !== aLand.developments.length) {
      const delta = aLand.developments.length - bLand.developments.length;
      const sign = delta >= 0 ? '+' : '';
      changes.push(
        `land ${aLand.id} developments: ${bLand.developments.length} ${sign}${delta} => ${aLand.developments.length}`,
      );
    }
  }
  return changes;
}

export default function App() {
  const [ctx] = useState(() => {
    const c = createEngine();
    c.game.active.ap = 30;
    return c;
  });
  const [log, setLog] = useState<string[]>([]);
  const [, forceUpdate] = useState(0);

  type SimpleAction = { id: string; name: string };
  const actions: SimpleAction[] = Array.from(
    (
      ctx.actions as unknown as {
        map: Map<string, SimpleAction>;
      }
    ).map.values(),
  );
  const player = ctx.game.active;

  const runPhaseTriggers = (
    trigger: 'onDevelopmentPhase' | 'onUpkeepPhase',
    entries: string[],
  ) => {
    const p = ctx.game.active;
    const run = (
      label: string,
      effects: Parameters<typeof runEffects>[0],
      mult = 1,
      params?: Record<string, unknown>,
    ) => {
      const before = snapshot(p);
      runEffects(
        params ? applyParamsToEffects(effects, params) : effects,
        ctx,
        mult,
      );
      const after = snapshot(p);
      const updates = diff(before, after);
      if (updates.length) entries.push(`${label} — ${updates.join(', ')}`);
    };

    for (const [role, count] of Object.entries(p.population)) {
      const def = ctx.populations.get(role);
      const effects = def?.[trigger];
      if (effects) run(`${def.name}`, effects, count as number);
    }
    for (const land of p.lands) {
      for (const id of land.developments) {
        const def = ctx.developments.get(id);
        const effects = def?.[trigger];
        if (effects)
          run(`${def.name} on ${land.id}`, effects, 1, { landId: land.id, id });
      }
    }
    for (const id of p.buildings) {
      const def = ctx.buildings.get(id);
      const effects = def?.[trigger];
      if (effects) run(`${def.name}`, effects);
    }
  };

  const cyclePhase = () => {
    const current = ctx.game.currentPhase;
    const next =
      current === Phase.Development
        ? Phase.Upkeep
        : current === Phase.Upkeep
          ? Phase.Main
          : Phase.Development;
    ctx.game.currentPhase = next;
    const entries: string[] = [`${next} phase`];
    if (next === Phase.Development)
      runPhaseTriggers('onDevelopmentPhase', entries);
    else if (next === Phase.Upkeep) runPhaseTriggers('onUpkeepPhase', entries);
    setLog((l) => [...l, ...entries]);
    forceUpdate((v) => v + 1);
  };

  const handleAction = (id: string) => {
    const before = snapshot(player);
    try {
      performAction(id, ctx);
      const after = snapshot(player);
      const updates = diff(before, after);
      setLog((l) => [
        ...l,
        `Action ${id} succeeded${updates.length ? ' — ' + updates.join(', ') : ''}`,
      ]);
    } catch (e) {
      setLog((l) => [...l, `Action ${id} failed — ${String(e)}`]);
    }
    forceUpdate((v) => v + 1);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">testlab</h1>
      <div className="mb-4">
        <span>phase: {ctx.game.currentPhase}</span>
        <button
          className="ml-2 px-2 py-1 bg-green-500 text-white rounded"
          onClick={cyclePhase}
        >
          next phase
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <section>
          <h2 className="font-semibold">Player</h2>
          <div>
            <h3 className="font-semibold">Resources</h3>
            <ul>
              {Object.entries(player.resources).map(([k, v]) => (
                <li key={k}>
                  {k}: {v as number}
                </li>
              ))}
            </ul>
            <h3 className="font-semibold mt-2">Stats</h3>
            <ul>
              {Object.entries(player.stats).map(([k, v]) => (
                <li key={k}>
                  {k}: {v as number}
                </li>
              ))}
            </ul>
            <h3 className="font-semibold mt-2">Buildings</h3>
            <ul>
              {Array.from(player.buildings).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <h3 className="font-semibold mt-2">Lands</h3>
            <ul>
              {player.lands.map((land) => (
                <li key={land.id}>
                  {land.id} ({land.slotsUsed}/{land.slotsMax})
                  <ul className="ml-4">
                    {land.developments.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-semibold">Actions</h2>
          <ul>
            {actions.map((a) => (
              <li key={a.id} className="mb-2">
                {a.name}
                <button
                  className="ml-2 px-2 py-1 bg-blue-500 text-white rounded"
                  onClick={() => handleAction(a.id)}
                >
                  perform action
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">Log</h2>
          <ul>
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
