import {
  EVALUATORS,
  type EffectDef,
  type EngineContext,
} from '@kingdom-builder/engine';
import {
  RESOURCES,
  STATS,
  POPULATION_ROLES,
  LAND_ICON as landIcon,
  SLOT_ICON as slotIcon,
  Stat,
} from '@kingdom-builder/contents';
import { PopulationRole } from '@kingdom-builder/engine/state';
interface StepDef {
  id: string;
  title?: string;
  triggers?: string[];
  effects?: EffectDef[];
}
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
  passives: string[];
}

export function snapshotPlayer(
  player: {
    id: string;
    resources: Record<string, number>;
    stats: Record<string, number>;
    buildings: Set<string>;
    lands: Land[];
  },
  ctx: EngineContext,
): PlayerSnapshot {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    passives: ctx.passives.list(player.id as any),
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
      const info = RESOURCES[key as keyof typeof RESOURCES];
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
      const info = STATS[key as keyof typeof STATS];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      if (key === 'absorption' || key === 'growth') {
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
      const label = logContent('building', id, ctx)[0] ?? id;
      changes.push(`${label} built`);
    }
  for (const land of after.lands) {
    const prev = before.lands.find((l) => l.id === land.id);
    if (!prev) {
      changes.push(`${landIcon} New land`);
      continue;
    }
    for (const dev of land.developments)
      if (!prev.developments.includes(dev)) {
        const label = logContent('development', dev, ctx)[0] ?? dev;
        changes.push(`${landIcon} +${label}`);
      }
  }
  const beforeSlots = before.lands.reduce((sum, l) => sum + l.slotsMax, 0);
  const afterSlots = after.lands.reduce((sum, l) => sum + l.slotsMax, 0);
  const newLandSlots = after.lands
    .filter((l) => !before.lands.some((b) => b.id === l.id))
    .reduce((sum, l) => sum + l.slotsMax, 0);
  const slotDelta = afterSlots - newLandSlots - beforeSlots;
  if (slotDelta !== 0)
    changes.push(
      `${slotIcon} Development Slot ${slotDelta >= 0 ? '+' : ''}${slotDelta} (${beforeSlots}→${beforeSlots + slotDelta})`,
    );
  const beforeP = new Set(before.passives);
  const afterP = new Set(after.passives);
  for (const id of beforeP)
    if (!afterP.has(id)) changes.push(`Passive ${id} removed`);
  return changes;
}

function collectResourceSources(
  step: StepDef | undefined,
  ctx: EngineContext,
): Record<string, string> {
  const map: Record<string, { icons: string; mods: string }> = {};
  for (const eff of step?.effects || []) {
    if (eff.evaluator && eff.effects) {
      const inner = eff.effects.find((e) => e.type === 'resource');
      if (!inner) continue;
      const key = inner.params?.['key'] as string | undefined;
      if (!key) continue;
      const entry = map[key] || { icons: '', mods: '' };
      const ev = eff.evaluator as {
        type: string;
        params?: Record<string, unknown>;
      };
      try {
        const handler = EVALUATORS.get(ev.type);
        const count = Number(handler(ev, ctx));
        if (ev.type === 'development') {
          const id = (ev.params as Record<string, string> | undefined)?.['id'];
          const icon = id ? ctx.developments.get(id)?.icon || '' : '';
          entry.icons += icon.repeat(count);
        } else if (ev.type === 'population') {
          const role = (ev.params as Record<string, string> | undefined)?.[
            'role'
          ] as keyof typeof POPULATION_ROLES | undefined;
          const icon = role ? POPULATION_ROLES[role]?.icon || role : '👥';
          entry.icons += icon.repeat(count);
        }
        const idParam = ev.params?.['id'];
        const target =
          ev.params && 'id' in ev.params
            ? `${ev.type}:${String(idParam)}`
            : ev.type;
        const passives = ctx.passives as unknown as {
          evaluationMods?: Map<string, Map<string, unknown>>;
        };
        const modsMap = passives.evaluationMods?.get(target);
        if (modsMap) {
          for (const key of modsMap.keys()) {
            if (!key.endsWith(`_${ctx.activePlayer.id}`)) continue;
            const base = key.replace(`_${ctx.activePlayer.id}`, '');
            const parts = base.split('_');
            let icon = '';
            for (let i = parts.length; i > 0; i--) {
              const candidate = parts.slice(0, i).join('_');
              try {
                icon = ctx.buildings.get(candidate)?.icon || '';
              } catch {
                /* ignore */
              }
              if (icon) break;
            }
            if (!icon) icon = ctx.actions.get('build').icon || '';
            entry.mods += icon;
          }
        }
      } catch {
        // ignore missing evaluators
      }
      map[key] = entry;
    }
  }
  const result: Record<string, string> = {};
  for (const [key, { icons, mods }] of Object.entries(map)) {
    let part = icons;
    if (mods) part += `+${mods}`;
    result[key] = part;
  }
  return result;
}

export function diffStepSnapshots(
  before: PlayerSnapshot,
  after: PlayerSnapshot,
  step: StepDef | undefined,
  ctx: EngineContext,
): string[] {
  const changes: string[] = [];
  const sources = collectResourceSources(step, ctx);
  for (const key of Object.keys(after.resources)) {
    const b = before.resources[key] ?? 0;
    const a = after.resources[key] ?? 0;
    if (a !== b) {
      const info = RESOURCES[key as keyof typeof RESOURCES];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      let line = `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`;
      const src = sources[key];
      if (src)
        line += ` (${info?.icon || key}${delta >= 0 ? '+' : ''}${delta} from ${src})`;
      changes.push(line);
    }
  }
  for (const key of Object.keys(after.stats)) {
    const b = before.stats[key] ?? 0;
    const a = after.stats[key] ?? 0;
    if (a !== b) {
      const info = STATS[key as keyof typeof STATS];
      const iconOnly = info?.icon || '';
      const icon = iconOnly ? `${iconOnly} ` : '';
      const label = info?.label ?? key;
      const delta = a - b;
      if (key === 'absorption' || key === 'growth') {
        const bPerc = b * 100;
        const aPerc = a * 100;
        const dPerc = delta * 100;
        changes.push(
          `${icon}${label} ${dPerc >= 0 ? '+' : ''}${dPerc}% (${bPerc}→${aPerc}%)`,
        );
      } else {
        let line = `${icon}${label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a})`;
        if (
          step?.id === 'raise-strength' &&
          (key === Stat.armyStrength || key === Stat.fortificationStrength) &&
          delta > 0
        ) {
          const role =
            key === Stat.armyStrength
              ? PopulationRole.Commander
              : PopulationRole.Fortifier;
          const count = ctx.activePlayer.population[role] ?? 0;
          const popIcon = POPULATION_ROLES[role]?.icon || '';
          const growth = ctx.activePlayer.stats[Stat.growth] ?? 0;
          const growthIcon = STATS[Stat.growth]?.icon || '';
          line += ` (${iconOnly}${b} + (${popIcon}${count} * ${growthIcon}${growth * 100}%) = ${iconOnly}${a})`;
        }
        changes.push(line);
      }
    }
  }
  const beforeB = new Set(before.buildings);
  const afterB = new Set(after.buildings);
  for (const id of afterB)
    if (!beforeB.has(id)) {
      const label = logContent('building', id, ctx)[0] ?? id;
      changes.push(`${label} built`);
    }
  for (const land of after.lands) {
    const prev = before.lands.find((l) => l.id === land.id);
    if (!prev) {
      changes.push(`${landIcon} New land`);
      continue;
    }
    for (const dev of land.developments)
      if (!prev.developments.includes(dev)) {
        const label = logContent('development', dev, ctx)[0] ?? dev;
        changes.push(`${landIcon} +${label}`);
      }
  }
  const beforeSlots = before.lands.reduce((sum, l) => sum + l.slotsMax, 0);
  const afterSlots = after.lands.reduce((sum, l) => sum + l.slotsMax, 0);
  const newLandSlots = after.lands
    .filter((l) => !before.lands.some((b) => b.id === l.id))
    .reduce((sum, l) => sum + l.slotsMax, 0);
  const slotDelta = afterSlots - newLandSlots - beforeSlots;
  if (slotDelta !== 0)
    changes.push(
      `${slotIcon} Development Slot ${slotDelta >= 0 ? '+' : ''}${slotDelta} (${beforeSlots}→${beforeSlots + slotDelta})`,
    );
  const beforeP = new Set(before.passives);
  const afterP = new Set(after.passives);
  for (const id of beforeP)
    if (!afterP.has(id)) changes.push(`Passive ${id} removed`);
  return changes;
}
