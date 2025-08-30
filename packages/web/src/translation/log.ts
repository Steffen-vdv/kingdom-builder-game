import type { EngineContext } from '@kingdom-builder/engine';
import { RESOURCES, STATS } from '@kingdom-builder/engine';
import { landIcon } from '../icons';
import { logContent, type Land } from './content';

export interface PlayerSnapshot {
  resources: Record<string, number>;
  stats: Record<string, number>;
  buildings: string[];
  lands: {
    id: string;
    slotsMax: number;
    slotsUsed: number;
    developments: string[];
  }[];
}

export function snapshotPlayer(player: {
  resources: Record<string, number>;
  stats: Record<string, number>;
  buildings: Set<string>;
  lands: Land[];
}): PlayerSnapshot {
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

export interface ChangeLog {
  key?: string;
  text: string;
}

export function diffSnapshots(
  before: PlayerSnapshot,
  after: PlayerSnapshot,
  ctx: EngineContext,
): ChangeLog[] {
  const changes: ChangeLog[] = [];
  for (const key of Object.keys(after.resources)) {
    const b = before.resources[key] ?? 0;
    const a = after.resources[key] ?? 0;
    if (a !== b) {
      const info = RESOURCES[key as keyof typeof RESOURCES];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      changes.push({
        key,
        text: `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`,
      });
    }
  }
  for (const key of Object.keys(after.stats)) {
    const b = before.stats[key] ?? 0;
    const a = after.stats[key] ?? 0;
    if (a !== b) {
      const info = STATS[key as keyof typeof STATS];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      if (key === 'absorption') {
        const bPerc = b * 100;
        const aPerc = a * 100;
        const dPerc = delta * 100;
        changes.push({
          key,
          text: `${icon}${label} ${dPerc >= 0 ? '+' : ''}${dPerc}% (${bPerc}→${aPerc}%)`,
        });
      } else {
        changes.push({
          key,
          text: `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`,
        });
      }
    }
  }
  const beforeB = new Set(before.buildings);
  const afterB = new Set(after.buildings);
  for (const id of afterB)
    if (!beforeB.has(id)) {
      const label = logContent('building', id, ctx)[0] ?? id;
      changes.push({ text: `${label} built` });
    }
  for (const land of after.lands) {
    const prev = before.lands.find((l) => l.id === land.id);
    if (!prev) {
      changes.push({ text: `${landIcon} New land` });
      continue;
    }
    for (const dev of land.developments)
      if (!prev.developments.includes(dev)) {
        const label = logContent('development', dev, ctx)[0] ?? dev;
        changes.push({ text: `${landIcon} +${label}` });
      }
  }
  return changes;
}
