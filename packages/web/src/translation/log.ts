import type { EngineContext } from '@kingdom-builder/engine';
import {
  resourceInfo,
  statInfo,
  developmentInfo,
  landIcon,
  buildingIcon,
} from '../icons';
import type { Land } from './content';

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

export function diffSnapshots(
  before: PlayerSnapshot,
  after: PlayerSnapshot,
  ctx: EngineContext,
): string[] {
  const changes: string[] = [];
  for (const key of Object.keys(after.resources)) {
    const b = before.resources[key] ?? 0;
    const a = after.resources[key] ?? 0;
    if (a !== b) {
      const info = resourceInfo[key as keyof typeof resourceInfo];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      changes.push(
        `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`,
      );
    }
  }
  for (const key of Object.keys(after.stats)) {
    const b = before.stats[key] ?? 0;
    const a = after.stats[key] ?? 0;
    if (a !== b) {
      const info = statInfo[key];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      if (key === 'absorption') {
        const bPerc = b * 100;
        const aPerc = a * 100;
        const dPerc = delta * 100;
        changes.push(
          `${icon}${label} ${dPerc >= 0 ? '+' : ''}${dPerc}% (${bPerc}→${aPerc}%)`,
        );
      } else {
        changes.push(
          `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`,
        );
      }
    }
  }
  const beforeB = new Set(before.buildings);
  const afterB = new Set(after.buildings);
  for (const id of afterB)
    if (!beforeB.has(id)) {
      let name = id;
      try {
        name = ctx.buildings.get(id).name;
      } catch {
        // use id if lookup fails
      }
      changes.push(`${buildingIcon} ${name} built`);
    }
  for (const land of after.lands) {
    const prev = before.lands.find((l) => l.id === land.id);
    if (!prev) {
      changes.push(`${landIcon} New land`);
      continue;
    }
    for (const dev of land.developments)
      if (!prev.developments.includes(dev)) {
        const icon = developmentInfo[dev]?.icon || dev;
        changes.push(`${landIcon} +${icon}`);
      }
  }
  return changes;
}
